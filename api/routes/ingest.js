// Ingest + audit + replay routes (Domain 1 write side, Domain 2 feed).
// Writes use the dedicated RW connection; reads use the read-only one.
import { Router } from 'express';
import { db, writeDb } from '../db.js';
import { ingestRecords } from '../lib/ingest.js';
import { mapAppleHealth } from '../lib/apple-health.js';

export const ingest = Router();

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) { res.status(e.status || 500).json({ error: e.message, ingest_id: e.ingest_id }); }
};

// Dispatch a parsed body by format → run ingest. Used by both live POSTs and replay.
// (Named runIngest, not `process`, so it never shadows the Node global.)
function runIngest(body, { format, replayOf = null }) {
  const payload = JSON.stringify(body);
  if (format === 'apple_health') {
    const mapped = mapAppleHealth(body);
    const summary = ingestRecords(writeDb(), {
      sourceName: 'apple_health', format: 'apple_health',
      records: mapped.records, payload, replayOf
    });
    return { ...summary, skipped: mapped.skipped, mapped_metrics: mapped.mappedMetrics };
  }
  // generic
  if (!Array.isArray(body?.records)) { const e = new Error('generic ingest needs { source, records:[...] }'); e.status = 400; throw e; }
  return ingestRecords(writeDb(), {
    sourceName: body.source, format: 'generic', records: body.records, payload, replayOf
  });
}

// Generic observation ingest. body: { source, records:[{metric_type,value,timestamp,external_id,unit?,source_updated_at?,metadata?}] }
ingest.post('/ingest', wrap((req, res) => {
  const out = runIngest(req.body || {}, { format: 'generic' });
  res.status(out.records_quarantined && !out.records_written ? 422 : 200).json(out);
}));

// Apple Health (Auto Health Export) ingest (goal 16).
ingest.post('/ingest/apple-health', wrap((req, res) => {
  const out = runIngest(req.body || {}, { format: 'apple_health' });
  res.status(out.records_quarantined && !out.records_written ? 422 : 200).json(out);
}));

// Replay a previously logged ingest from its stored raw payload (goal 8).
ingest.post('/ingest/:id/replay', wrap((req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = db().prepare('SELECT id, format, payload FROM ingest_log WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: `ingest ${id} not found` });
  if (!row.payload) return res.status(409).json({ error: `ingest ${id} has no stored payload to replay` });
  const out = runIngest(JSON.parse(row.payload), { format: row.format, replayOf: id });
  res.json({ replay_of: id, ...out });
}));

// Ingest audit log (goal 7).
ingest.get('/ingest', wrap((req, res) => {
  const full = req.query.full === '1';
  const cols = full ? '*' : 'id, received_at, source, format, status, records_in, records_written, records_quarantined, replay_of';
  const rows = db().prepare(`SELECT ${cols} FROM ingest_log ORDER BY id DESC LIMIT 200`).all();
  res.json({ ingests: rows });
}));
ingest.get('/ingest/:id', wrap((req, res) => {
  const row = db().prepare('SELECT * FROM ingest_log WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
}));

// Quarantine inspection (goal 10).
ingest.get('/quarantine', wrap((req, res) => {
  const resolved = req.query.resolved === '1' ? 1 : 0;
  const rows = db().prepare('SELECT * FROM quarantine WHERE resolved = ? ORDER BY id DESC LIMIT 500').all(resolved);
  res.json({ quarantine: rows.map(r => ({ ...r, raw_record: safe(r.raw_record) })) });
}));

function safe(s) { try { return JSON.parse(s); } catch { return s; } }
