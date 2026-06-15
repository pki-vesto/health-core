// Briefing snapshot persistence + dedupe (issue #32).
// Covers: snapshotBriefing writes one row with sha256, dedupes within the same
// Europe/Amsterdam day by (period, payload_sha256), allows a second row when
// the payload differs, and briefAndSnapshot returns a snapshot_id.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, insertObs, harness } from './fixtures.mjs';
import {
  brief, briefAndSnapshot, snapshotBriefing,
  listBriefingSnapshots, getBriefingSnapshot, priorBriefingSnapshot
} from '../lib/health-os.js';

export function run() {
  const t = harness('briefing snapshots (#32)');

  // ── snapshotBriefing writes one row + dedupes identical payload same-day ───
  {
    const db = buildDb();
    const today = db.prepare("SELECT date('now') AS d").get().d;
    insertObs(db, { metric: 'body.weight', date: today, value: 80 });
    const b = brief(db, 'daily');
    const r1 = snapshotBriefing(db, b, { period: 'daily' });
    t.ok('first snapshot persisted', r1.id != null && r1.deduped === false, JSON.stringify(r1));
    const n1 = db.prepare('SELECT COUNT(*) n FROM briefing_snapshots').get().n;
    t.eq('one briefing_snapshots row', n1, 1);

    const row = db.prepare('SELECT period, payload_sha256, payload, summary FROM briefing_snapshots WHERE id=?').get(r1.id);
    t.eq('row period stored', row.period, 'daily');
    t.ok('sha256 stored (64 hex chars)', /^[0-9a-f]{64}$/.test(row.payload_sha256), row.payload_sha256);
    t.ok('payload round-trips', JSON.parse(row.payload).period === 'daily');

    // Re-snapshot the exact same briefing object → dedupe, no new row.
    const r2 = snapshotBriefing(db, b, { period: 'daily' });
    t.eq('dedupe returns existing id', { id: r2.id, deduped: r2.deduped }, { id: r1.id, deduped: true });
    t.eq('still one row after dedupe', db.prepare('SELECT COUNT(*) n FROM briefing_snapshots').get().n, 1);
    closeDb(db);
  }

  // ── different payload → second row inserted ───────────────────────────────
  {
    const db = buildDb();
    const today = db.prepare("SELECT date('now') AS d").get().d;
    insertObs(db, { metric: 'body.weight', date: today, value: 80 });
    const b1 = brief(db, 'daily');
    snapshotBriefing(db, b1, { period: 'daily' });

    // Mutate payload so sha256 differs (simulating recomputed briefing later in the day).
    const b2 = { ...b1, summary: { ...(b1.summary || {}), forced_diff: 1 } };
    const r2 = snapshotBriefing(db, b2, { period: 'daily' });
    t.ok('different payload writes new row', !r2.deduped && r2.id != null);
    t.eq('two rows now', db.prepare('SELECT COUNT(*) n FROM briefing_snapshots').get().n, 2);
    closeDb(db);
  }

  // ── briefAndSnapshot returns snapshot id + dedupe flag ────────────────────
  {
    const db = buildDb();
    const today = db.prepare("SELECT date('now') AS d").get().d;
    insertObs(db, { metric: 'body.weight', date: today, value: 80 });
    const r1 = briefAndSnapshot(db, db, 'weekly');
    t.ok('briefAndSnapshot returns id', r1.snapshot_id != null);
    t.eq('briefAndSnapshot period', r1.period, 'weekly');
    const r2 = briefAndSnapshot(db, db, 'weekly');
    t.eq('repeat call dedupes', { id: r2.snapshot_id, deduped: r2.deduped }, { id: r1.snapshot_id, deduped: true });
    closeDb(db);
  }

  // ── unknown period rejected by snapshotBriefing ───────────────────────────
  {
    const db = buildDb();
    t.throws('unknown period → 400', () =>
      snapshotBriefing(db, { period: 'fortnightly', generated_at: '2026-06-15T08:00:00+02:00' }, { period: 'fortnightly' }), 400);
    closeDb(db);
  }

  // ── listBriefingSnapshots orders DESC by generated_at, respects limit + period filter ──
  {
    const db = buildDb();
    const period = 'daily';
    // Insert directly so we can control generated_at + sha.
    const insert = db.prepare(
      `INSERT INTO briefing_snapshots (period, generated_at, payload, payload_sha256, summary)
       VALUES (?,?,?,?,?)`
    );
    insert.run(period, '2026-06-13T10:00:00+02:00', '{"x":1}', 'a'.repeat(64), 'older');
    insert.run(period, '2026-06-14T10:00:00+02:00', '{"x":2}', 'b'.repeat(64), 'middle');
    insert.run(period, '2026-06-15T10:00:00+02:00', '{"x":3}', 'c'.repeat(64), 'newest');
    insert.run('weekly', '2026-06-15T11:00:00+02:00', '{"x":4}', 'd'.repeat(64), 'weekly');

    const all = listBriefingSnapshots(db, { period: 'daily' });
    t.eq('history DESC order, daily only', all.map(r => r.summary), ['newest', 'middle', 'older']);
    const limited = listBriefingSnapshots(db, { period: 'daily', limit: 2 });
    t.eq('limit clamps result count', limited.length, 2);
    t.eq('limit returns newest two', limited.map(r => r.summary), ['newest', 'middle']);

    const all2 = listBriefingSnapshots(db);
    t.eq('no period filter returns all four', all2.length, 4);
    t.throws('unknown period filter → 400', () => listBriefingSnapshots(db, { period: 'fortnightly' }), 400);
    closeDb(db);
  }

  // ── getBriefingSnapshot returns parsed payload; priorBriefingSnapshot returns previous of same period ──
  {
    const db = buildDb();
    const insert = db.prepare(
      `INSERT INTO briefing_snapshots (period, generated_at, payload, payload_sha256, summary)
       VALUES (?,?,?,?,?)`
    );
    const r1 = insert.run('daily', '2026-06-13T10:00:00+02:00', JSON.stringify({ period: 'daily', n: 1 }), 'a'.repeat(64), null);
    const r2 = insert.run('weekly', '2026-06-14T10:00:00+02:00', JSON.stringify({ period: 'weekly', n: 2 }), 'b'.repeat(64), null);
    const r3 = insert.run('daily', '2026-06-15T10:00:00+02:00', JSON.stringify({ period: 'daily', n: 3 }), 'c'.repeat(64), null);

    const snap = getBriefingSnapshot(db, Number(r3.lastInsertRowid));
    t.eq('snapshot payload parsed back to object', snap.payload, { period: 'daily', n: 3 });

    const prior = priorBriefingSnapshot(db, { period: 'daily', id: Number(r3.lastInsertRowid) });
    t.eq('prior of same-period skips weekly row in between', prior?.id, Number(r1.lastInsertRowid));

    const noPrior = priorBriefingSnapshot(db, { period: 'daily', id: Number(r1.lastInsertRowid) });
    t.eq('no prior for first-ever daily snapshot', noPrior, null);

    const missing = getBriefingSnapshot(db, 9999);
    t.eq('missing id returns null', missing, null);
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
