// Ingest layer for the Core (Domain 1 write side + Domain 2 feed).
//
// Guarantees (architecture invariants):
//  - Idempotent (4): same payload re-sent → 0 new/changed rows.
//  - Last-Write-Wins (5): newer source_updated_at corrects an existing value;
//    older is ignored. Identical → no-op.
//  - Additive-only (3): writes only into observations via the canonical upsert;
//    never alters vocabulary. Unit must match the catalog or the record is
//    quarantined.
//  - Validation (goal 9) + quarantine (goal 10): a bad record is parked, the
//    rest of the batch still lands.
//  - Audited (goal 7) + replayable (goal 8): every batch logs to ingest_log
//    with its raw payload.
import { createHash } from 'node:crypto';

// Canonical upsert — byte-identical semantics to scripts/lib/coredb.mjs
// UPSERT_SQL and shred/api/core.js. metadata/timestamp are not touched on
// conflict; only a strictly-newer source_updated_at updates the value (LWW).
const UPSERT_SQL = `
INSERT INTO observations
  (metric_type, value, unit, timestamp, source, external_id, source_updated_at, metadata)
VALUES
  (@metric_type, @value, @unit, @timestamp, @source, @external_id, @source_updated_at, @metadata)
ON CONFLICT(source, external_id, metric_type) DO UPDATE SET
  value             = excluded.value,
  source_updated_at = excluded.source_updated_at,
  updated_at        = datetime('now')
WHERE excluded.source_updated_at > observations.source_updated_at;`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sha256(s) { return createHash('sha256').update(s).digest('hex'); }

export function resolveSourceId(db, name) {
  const row = db.prepare('SELECT id FROM sources WHERE name = ?').get(name);
  return row ? row.id : null;
}

function catalog(db) {
  const m = new Map();
  for (const r of db.prepare("SELECT key, unit, status FROM metric_types").all()) m.set(r.key, r);
  return m;
}

// Normalise + validate one record. Returns {ok, reason?, row?}.
// Accepts a record shaped like:
//   { metric_type, value, timestamp, external_id, unit?, source_updated_at?, metadata? }
function normalize(rec, cat, todayUtc) {
  if (!rec || typeof rec !== 'object') return { ok: false, reason: 'record not an object' };
  const key = rec.metric_type;
  if (!key || !cat.has(key)) return { ok: false, reason: `unknown metric_type '${key}'` };
  const meta = cat.get(key);
  if (meta.status === 'deprecated') return { ok: false, reason: `metric_type '${key}' is deprecated` };

  const value = Number(rec.value);
  if (!Number.isFinite(value)) return { ok: false, reason: `value not finite: ${rec.value}` };

  // Accept 'YYYY-MM-DD' or an ISO datetime; reduce to the calendar date.
  let ts = String(rec.timestamp ?? '');
  if (!DATE_RE.test(ts)) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return { ok: false, reason: `bad timestamp: ${rec.timestamp}` };
    ts = d.toISOString().slice(0, 10);
  }
  if (ts > todayUtc) return { ok: false, reason: `future timestamp: ${ts}` };

  const unit = rec.unit ?? meta.unit;
  if (unit !== meta.unit) return { ok: false, reason: `unit '${unit}' != catalog '${meta.unit}' for ${key}` };

  const external_id = rec.external_id;
  if (!external_id || typeof external_id !== 'string') return { ok: false, reason: 'missing external_id' };

  // source_updated_at drives LWW. Provided value wins; else synthesise a
  // deterministic stamp from the date so re-ingest is idempotent. A malformed
  // stamp is quarantined (NOT thrown) so one bad record can't sink the batch —
  // mirrors the defensive timestamp handling above (goals 9/10).
  let sua;
  if (rec.source_updated_at) {
    const d = new Date(rec.source_updated_at);
    if (isNaN(d.getTime())) return { ok: false, reason: `bad source_updated_at: ${rec.source_updated_at}` };
    sua = d.toISOString();
  } else {
    sua = `${ts}T00:00:00.000Z`;
  }

  let metadata = rec.metadata ?? {};
  if (typeof metadata !== 'object' || Array.isArray(metadata)) metadata = {};

  return {
    ok: true,
    row: {
      metric_type: key, value, unit, timestamp: ts, external_id,
      source_updated_at: sua, metadata
    }
  };
}

// Ingest a batch. `records` are pre-mapped generic observation records. Runs in
// one transaction; invalid records are quarantined, valid ones upserted (LWW).
// Returns { ingest_id, status, records_in, records_written, records_quarantined }.
export function ingestRecords(db, { sourceName, format = 'generic', records = [], payload = null, replayOf = null }) {
  const sourceId = resolveSourceId(db, sourceName);
  if (!sourceId) {
    // Log the rejection so even a bad source is auditable.
    const info = db.prepare(
      `INSERT INTO ingest_log (source, format, status, records_in, payload_sha256, payload, error, replay_of)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(String(sourceName), format, 'rejected', records.length,
      payload ? sha256(payload) : null, payload, `unknown source '${sourceName}'`, replayOf);
    const e = new Error(`unknown source '${sourceName}'`); e.status = 400; e.ingest_id = info.lastInsertRowid; throw e;
  }

  const cat = catalog(db);
  const todayUtc = db.prepare("SELECT date('now') AS d").get().d;
  const upsert = db.prepare(UPSERT_SQL);
  const quarantineStmt = db.prepare(
    `INSERT INTO quarantine (ingest_id, source, raw_record, reason) VALUES (?,?,?,?)`
  );
  const logStmt = db.prepare(
    `INSERT INTO ingest_log (source, format, status, records_in, records_written, records_quarantined, payload_sha256, payload, replay_of)
     VALUES (@source,@format,@status,@in,@written,@quar,@sha,@payload,@replay_of)`
  );

  const tx = db.transaction(() => {
    const logId = logStmt.run({
      source: sourceName, format, status: 'partial', in: records.length,
      written: 0, quar: 0, sha: payload ? sha256(payload) : null, payload, replay_of: replayOf
    }).lastInsertRowid;

    let written = 0, quarantined = 0;
    for (const rec of records) {
      const n = normalize(rec, cat, todayUtc);
      if (!n.ok) {
        quarantineStmt.run(logId, sourceName, JSON.stringify(rec), n.reason);
        quarantined++;
        continue;
      }
      const r = upsert.run({
        ...n.row, source: sourceId,
        metadata: JSON.stringify({ ...n.row.metadata, ingest_id: Number(logId), source_path: format === 'apple_health' ? 'apple_health' : 'ingest' })
      });
      if (r.changes > 0) written++;
    }
    const status = quarantined === 0 ? 'accepted' : (written === 0 ? 'rejected' : 'partial');
    db.prepare('UPDATE ingest_log SET records_written=?, records_quarantined=?, status=? WHERE id=?')
      .run(written, quarantined, status, logId);
    return { ingest_id: Number(logId), status, records_in: records.length, records_written: written, records_quarantined: quarantined };
  });

  return tx();
}
