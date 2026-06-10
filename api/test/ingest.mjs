// Ingest logic integration test — runs against a TEMP database built from the
// real migrations, so it never touches the live Core. Run inside the api image:
//   NODE_MODULES_BASE=/app/node_modules/ node test/ingest.mjs
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapAppleHealth } from '../lib/apple-health.js';
import { ingestRecords } from '../lib/ingest.js';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
const HERE = dirname(fileURLToPath(import.meta.url));
const MIG = join(HERE, '..', '..', 'migrations');

let pass = 0, fail = 0;
const ok = (n, c, d = '') => c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.error(`  ✗ ${n}${d ? ' — ' + d : ''}`));

// ── build a fresh temp DB from the migrations + seed base sources ────────────
const TMP = `/tmp/test-core-${process.pid}.db`;
rmSync(TMP, { force: true });
const db = new Database(TMP);
db.pragma('foreign_keys = ON');
for (const f of readdirSync(MIG).filter(f => /^\d+.*\.sql$/.test(f)).sort()) db.exec(readFileSync(join(MIG, f), 'utf8'));
for (const [n, k] of [['manual', 'user'], ['shred', 'module'], ['apple_health', 'device'], ['lab', 'lab']])
  db.prepare('INSERT OR IGNORE INTO sources (name, kind) VALUES (?,?)').run(n, k);
db.prepare("INSERT OR IGNORE INTO metric_types (key,display_name,unit,value_kind,status,description) VALUES ('body.weight','Body weight','kg','numeric','active',null)").run();

console.log('Ingest logic tests (temp DB)');

// ── mapper ────────────────────────────────────────────────────────────────
const payload = { data: { metrics: [
  { name: 'step_count', units: 'count', data: [
    { date: '2026-05-01 09:00:00 +0000', qty: 3000 },
    { date: '2026-05-01 18:00:00 +0000', qty: 5421 },   // same day → sum = 8421
    { date: '2026-05-02 12:00:00 +0000', qty: 10000 } ] },
  { name: 'resting_heart_rate', units: 'bpm', data: [
    { date: '2026-05-01 06:00:00 +0000', qty: 52 },
    { date: '2026-05-01 22:00:00 +0000', qty: 56 } ] },   // avg = 54
  { name: 'sleep_analysis', units: 'hr', data: [ { date: '2026-05-01 07:00:00 +0000', asleep: 7.5 } ] },
  { name: 'totally_unknown_metric', units: 'x', data: [ { date: '2026-05-01', qty: 1 } ] }
] } };

const mapped = mapAppleHealth(payload);
const steps0501 = mapped.records.find(r => r.metric_type === 'activity.steps' && r.timestamp === '2026-05-01');
ok('mapper sums same-day steps', steps0501?.value === 8421, JSON.stringify(steps0501));
ok('mapper averages resting HR', mapped.records.find(r => r.metric_type === 'heart.resting_rate' && r.timestamp === '2026-05-01')?.value === 54);
ok('mapper maps sleep hours', mapped.records.find(r => r.metric_type === 'sleep.duration')?.value === 7.5);
ok('mapper reports skipped unknowns', mapped.skipped.some(s => s.name === 'totally_unknown_metric'));
ok('mapper stable external_id', steps0501?.external_id === 'apple:activity.steps:2026-05-01');

// ── ingest + idempotency ─────────────────────────────────────────────────────
const r1 = ingestRecords(db, { sourceName: 'apple_health', format: 'apple_health', records: mapped.records, payload: JSON.stringify(payload) });
ok('ingest writes all valid records', r1.records_written === mapped.records.length, JSON.stringify(r1));
ok('ingest status accepted', r1.status === 'accepted');
ok('observation stored correctly', db.prepare("SELECT value FROM observations WHERE external_id='apple:activity.steps:2026-05-01'").get()?.value === 8421);

const r2 = ingestRecords(db, { sourceName: 'apple_health', format: 'apple_health', records: mapAppleHealth(payload).records, payload: JSON.stringify(payload) });
ok('idempotent re-ingest writes 0', r2.records_written === 0, JSON.stringify(r2));

// ── LWW correction (newer sample datetime updates; older is ignored) ─────────
const corrected = { data: { metrics: [ { name: 'resting_heart_rate', units: 'bpm', data: [
  { date: '2026-05-01 23:30:00 +0000', qty: 60 } ] } ] } };  // later time → newer source_updated_at
const r3 = ingestRecords(db, { sourceName: 'apple_health', format: 'apple_health', records: mapAppleHealth(corrected).records, payload: '{}' });
ok('LWW newer value updates', r3.records_written === 1 && db.prepare("SELECT value FROM observations WHERE external_id='apple:heart.resting_rate:2026-05-01'").get().value === 60);

const stale = ingestRecords(db, { sourceName: 'apple_health', format: 'apple_health',
  records: [{ metric_type: 'heart.resting_rate', value: 99, unit: 'bpm', timestamp: '2026-05-01', external_id: 'apple:heart.resting_rate:2026-05-01', source_updated_at: '2020-01-01T00:00:00.000Z' }], payload: '{}' });
ok('LWW older value ignored', stale.records_written === 0 && db.prepare("SELECT value FROM observations WHERE external_id='apple:heart.resting_rate:2026-05-01'").get().value === 60);

// ── validation + quarantine ──────────────────────────────────────────────────
const bad = ingestRecords(db, { sourceName: 'manual', format: 'generic', payload: '{}', records: [
  { metric_type: 'body.weight', value: 80, unit: 'kg', timestamp: '2026-05-01', external_id: 'w:1' }, // good
  { metric_type: 'no.such.metric', value: 1, timestamp: '2026-05-01', external_id: 'x:1' },            // unknown metric
  { metric_type: 'body.weight', value: 80, unit: 'g', timestamp: '2026-05-01', external_id: 'w:2' },   // unit mismatch
  { metric_type: 'body.weight', value: 'NaN', unit: 'kg', timestamp: '2026-05-01', external_id: 'w:3' },// bad value
  { metric_type: 'body.weight', value: 80, unit: 'kg', timestamp: '2999-01-01', external_id: 'w:4' }   // future
] });
ok('batch writes the one valid record', bad.records_written === 1, JSON.stringify(bad));
ok('batch quarantines the four bad records', bad.records_quarantined === 4, JSON.stringify(bad));
ok('batch status partial', bad.status === 'partial');
ok('quarantine table populated', db.prepare('SELECT COUNT(*) n FROM quarantine').get().n === 4);
ok('ingest_log records the batch', db.prepare('SELECT records_written, records_quarantined FROM ingest_log WHERE id=?').get(bad.ingest_id).records_quarantined === 4);

// ── malformed source_updated_at is quarantined, never sinks the batch ─────────
// Regression: a bad date once threw inside the tx, rolling back the whole batch
// (lost valid rows + audit log). It must now be parked like any other bad field.
const suaBatch = ingestRecords(db, { sourceName: 'manual', format: 'generic', payload: '{}', records: [
  { metric_type: 'body.weight', value: 82, unit: 'kg', timestamp: '2026-05-10', external_id: 'w:sua-good' },          // good
  { metric_type: 'body.weight', value: 83, unit: 'kg', timestamp: '2026-05-11', external_id: 'w:sua-bad',
    source_updated_at: 'not-a-real-date' }                                                                            // malformed stamp
]});
ok('malformed source_updated_at: good record still lands', suaBatch.records_written === 1, JSON.stringify(suaBatch));
ok('malformed source_updated_at: bad record quarantined', suaBatch.records_quarantined === 1, JSON.stringify(suaBatch));
ok('malformed source_updated_at: batch is audited (not rolled back)',
  db.prepare('SELECT status FROM ingest_log WHERE id=?').get(suaBatch.ingest_id)?.status === 'partial');
ok('malformed source_updated_at: good value readable', db.prepare("SELECT value FROM observations WHERE external_id='w:sua-good'").get()?.value === 82);

// ── unknown source rejected + logged ─────────────────────────────────────────
let threw = false;
try { ingestRecords(db, { sourceName: 'ghost', format: 'generic', records: [], payload: '{}' }); }
catch (e) { threw = e.status === 400; }
ok('unknown source rejected (400) + logged', threw && db.prepare("SELECT status FROM ingest_log WHERE source='ghost'").get()?.status === 'rejected');

db.close();
rmSync(TMP, { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
