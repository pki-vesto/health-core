// Step 3: idempotent backfill of shred.db history into core.db.
//   node backfill.mjs --dry-run   # report counts + samples, write nothing
//   node backfill.mjs             # real run (transactional upsert)
//
// Writes under source='shred' with metadata.imported_by='backfill'. Re-running
// is a no-op (LWW conflict clause): second run inserts 0 new rows.
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
import { openCore, getSourceId, prepareUpsert } from './lib/coredb.mjs';
import {
  dayToDate, epochToIso, round2, nutritionTotals, setsVolume,
  extId, UNITS, DERIVED
} from './lib/aggregate.mjs';

const DRY = process.argv.includes('--dry-run');
const SHRED_DB = process.env.SHRED_DB || '/data/shred.db';
const CORE_DB = process.env.CORE_DB || '/health-core/data/core.db';
const TAG = { imported_by: 'backfill' };   // provenance for every backfilled row

const shred = new Database(SHRED_DB, { readonly: true });
const core = openCore(CORE_DB);
const sourceId = getSourceId(core, 'shred');

// startDate drives every timestamp; refuse to guess if absent.
const startRow = shred.prepare("SELECT value FROM meta WHERE key='startDate'").get();
if (!startRow) { console.error('FATAL: meta.startDate missing — cannot map day index to date'); process.exit(1); }
const startDate = JSON.parse(startRow.value);

// Products map for nutrition lookup (includes seed: and user products; matches
// the client which looks up state.products[id] regardless of hidden/deleted).
const products = new Map();
for (const p of shred.prepare('SELECT id, value FROM products').all()) {
  try { products.set(p.id, JSON.parse(p.value)); } catch { /* skip unparseable */ }
}
const getProduct = (id) => products.get(id) || null;

// ── Build observation rows from each source table ───────────────────────────
const obs = [];
const push = (o) => obs.push({ ...o, source: sourceId, metadata: JSON.stringify(o.metadata) });

// weights → body.weight (category 1: raw, no derived tag)
for (const w of shred.prepare('SELECT day, kg, updated_at FROM weights').all()) {
  push({
    metric_type: 'body.weight',
    value: Number(w.kg),
    unit: UNITS['body.weight'],
    timestamp: dayToDate(startDate, w.day),
    external_id: extId.weight(w.day),
    source_updated_at: epochToIso(w.updated_at),
    metadata: { ...TAG }
  });
}

// foods → nutrition.* day totals (category 2: derived tag). Skip days with no
// logged items.
for (const f of shred.prepare('SELECT day, value, updated_at FROM foods').all()) {
  let val; try { val = JSON.parse(f.value); } catch { continue; }
  const t = nutritionTotals(val, getProduct);
  if (t.itemCount === 0) continue;
  const date = dayToDate(startDate, f.day);
  const sua = epochToIso(f.updated_at);
  const md = { ...TAG, ...DERIVED.nutrition };
  for (const [metric, value] of [
    ['nutrition.calories', t.kcal], ['nutrition.protein', t.p],
    ['nutrition.carbs', t.c], ['nutrition.fat', t.f]
  ]) {
    push({
      metric_type: metric, value: round2(value), unit: UNITS[metric],
      timestamp: date, external_id: extId.foodsDay(date), source_updated_at: sua, metadata: md
    });
  }
}

// sets → fitness.session_volume per day (category 2: derived tag). Group all
// exercise rows by day; emit only days with volume > 0.
const byDay = new Map();
for (const s of shred.prepare('SELECT day, sets, updated_at FROM sets').all()) {
  let arr; try { arr = JSON.parse(s.sets); } catch { arr = []; }
  const e = byDay.get(s.day) || { arrays: [], maxUpdated: 0 };
  e.arrays.push(arr);
  if (s.updated_at > e.maxUpdated) e.maxUpdated = s.updated_at;
  byDay.set(s.day, e);
}
for (const [day, e] of byDay) {
  const vol = setsVolume(e.arrays);
  if (vol <= 0) continue;
  const date = dayToDate(startDate, day);
  push({
    metric_type: 'fitness.session_volume', value: round2(vol), unit: UNITS['fitness.session_volume'],
    timestamp: date, external_id: extId.session(date),
    source_updated_at: epochToIso(e.maxUpdated), metadata: { ...TAG, ...DERIVED.volume }
  });
}

shred.close();

// ── Report / write ──────────────────────────────────────────────────────────
const byMetric = new Map();
for (const o of obs) (byMetric.get(o.metric_type) || byMetric.set(o.metric_type, []).get(o.metric_type)).push(o);

console.log(`=== backfill ${DRY ? '(DRY-RUN)' : '(WRITE)'} ===`);
console.log('startDate:', startDate, '| candidate observations:', obs.length);
for (const [metric, rows] of [...byMetric].sort()) {
  const s = rows[0];
  console.log(`  ${metric.padEnd(24)} n=${String(rows.length).padStart(3)}  sample: ` +
    `ts=${s.timestamp} value=${s.value}${s.unit} ext=${s.external_id}`);
}

if (DRY) {
  console.log('\nDRY-RUN: nothing written.');
  core.close();
} else {
  const upsert = prepareUpsert(core);
  const before = core.prepare('SELECT COUNT(*) c FROM observations').get().c;
  let writes = 0;
  const run = core.transaction((rows) => {
    for (const o of rows) writes += upsert.run(o).changes;
  });
  run(obs);
  const after = core.prepare('SELECT COUNT(*) c FROM observations').get().c;
  core.close();
  console.log(`\nWrite complete. rows before=${before} after=${after} ` +
    `newRows=${after - before} writes(insert+lww-update)=${writes}`);
}
