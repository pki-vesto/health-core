// Tracking-form correction semantics (task #13). The manual track form uses a
// STABLE external_id (`ui:<metric>:<date>`) plus a fresh source_updated_at, so a
// re-save of the same metric/date intentionally corrects the day's value (LWW),
// while a stale write is ignored. This exercises the exact ingest contract the
// UI relies on.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, harness } from './fixtures.mjs';
import { ingestRecords } from '../lib/ingest.js';

const EXT = 'ui:body.weight:2026-05-01';
const save = (db, value, sua) => ingestRecords(db, {
  sourceName: 'manual', format: 'generic', payload: '{}',
  records: [{ metric_type: 'body.weight', value, unit: 'kg', timestamp: '2026-05-01', external_id: EXT, source_updated_at: sua }]
});
const current = (db) => db.prepare(`SELECT value FROM observations WHERE external_id='${EXT}'`).get()?.value;
const rowCount = (db) => db.prepare(`SELECT COUNT(*) n FROM observations WHERE external_id='${EXT}'`).get().n;

export function run() {
  const t = harness('tracking correction semantics (#13)');
  const db = buildDb();

  const r1 = save(db, 80, '2026-05-01T08:00:00.000Z');
  t.eq('first save inserts', { written: r1.records_written, value: current(db) }, { written: 1, value: 80 });

  const r2 = save(db, 82, '2026-05-01T09:00:00.000Z'); // newer stamp → intentional correction
  t.eq('newer save corrects in place', { written: r2.records_written, value: current(db) }, { written: 1, value: 82 });

  const r3 = save(db, 70, '2026-05-01T07:00:00.000Z'); // older stamp → ignored
  t.eq('stale save ignored', { written: r3.records_written, value: current(db) }, { written: 0, value: 82 });

  t.eq('stable external_id keeps a single row (no duplicates)', rowCount(db), 1);

  closeDb(db);
  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
