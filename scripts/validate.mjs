// Step 5: validate the backfill. Goes beyond counts — recomputes aggregates
// independently from shred.db and reconciles them against core.db, checks
// timestamp ranges, value plausibility, and referential integrity.
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
import { dayToDate, round2, nutritionTotals, setsVolume } from './lib/aggregate.mjs';

const SHRED_DB = process.env.SHRED_DB || '/data/shred.db';
const CORE_DB = process.env.CORE_DB || '/health-core/data/core.db';
const shred = new Database(SHRED_DB, { readonly: true });
const core = new Database(CORE_DB, { readonly: true });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

const startDate = JSON.parse(shred.prepare("SELECT value FROM meta WHERE key='startDate'").get().value);
const products = new Map();
for (const p of shred.prepare('SELECT id, value FROM products').all()) {
  try { products.set(p.id, JSON.parse(p.value)); } catch {}
}
const getProduct = (id) => products.get(id) || null;

console.log('=== 1. observations per metric_type ===');
for (const r of core.prepare('SELECT metric_type, COUNT(*) n FROM observations GROUP BY metric_type ORDER BY metric_type').all())
  console.log(`  ${r.metric_type.padEnd(24)} ${r.n}`);

console.log('\n=== 2. body.weight count == source weights count ===');
const srcW = shred.prepare('SELECT COUNT(*) c FROM weights').get().c;
const coreW = core.prepare("SELECT COUNT(*) c FROM observations WHERE metric_type='body.weight'").get().c;
check('body.weight count matches weights rows', srcW === coreW, `source=${srcW} core=${coreW}`);

console.log('\n=== 3. first/last timestamp per metric_type vs source ===');
// Expected date ranges derived from source day-indices.
const wDays = shred.prepare('SELECT day FROM weights ORDER BY day').all().map(r => r.day);
const expW = [dayToDate(startDate, wDays[0]), dayToDate(startDate, wDays[wDays.length - 1])];
// foods days with >=1 item
const fDays = shred.prepare('SELECT day, value FROM foods ORDER BY day').all()
  .filter(r => { try { return nutritionTotals(JSON.parse(r.value), getProduct).itemCount > 0; } catch { return false; } })
  .map(r => r.day);
const expF = [dayToDate(startDate, fDays[0]), dayToDate(startDate, fDays[fDays.length - 1])];
// sets days with volume > 0
const setByDay = new Map();
for (const s of shred.prepare('SELECT day, sets FROM sets').all()) {
  let a; try { a = JSON.parse(s.sets); } catch { a = []; }
  (setByDay.get(s.day) || setByDay.set(s.day, []).get(s.day)).push(a);
}
const vDays = [...setByDay].filter(([, arrs]) => setsVolume(arrs) > 0).map(([d]) => d).sort((a, b) => a - b);
const expV = [dayToDate(startDate, vDays[0]), dayToDate(startDate, vDays[vDays.length - 1])];

const ranges = {
  'body.weight': expW,
  'nutrition.calories': expF, 'nutrition.protein': expF, 'nutrition.carbs': expF, 'nutrition.fat': expF,
  'fitness.session_volume': expV
};
for (const [metric, [efirst, elast]] of Object.entries(ranges)) {
  const r = core.prepare('SELECT MIN(timestamp) mn, MAX(timestamp) mx FROM observations WHERE metric_type=?').get(metric);
  check(`${metric} range`, r.mn === efirst && r.mx === elast, `core=[${r.mn}..${r.mx}] expected=[${efirst}..${elast}]`);
}

console.log('\n=== 4. min/max plausibility per metric_type ===');
for (const r of core.prepare('SELECT metric_type, MIN(value) mn, MAX(value) mx FROM observations GROUP BY metric_type ORDER BY metric_type').all())
  console.log(`  ${r.metric_type.padEnd(24)} min=${r.mn} max=${r.mx}`);
const wr = core.prepare("SELECT MIN(value) mn, MAX(value) mx FROM observations WHERE metric_type='body.weight'").get();
check('body.weight within 30–300 kg (catches kg↔g error)', wr.mn >= 30 && wr.mx <= 300, `min=${wr.mn} max=${wr.mx}`);

console.log('\n=== 5. no orphan metric_types (FK integrity) ===');
const orphans = core.prepare(
  'SELECT DISTINCT o.metric_type FROM observations o LEFT JOIN metric_types m ON m.key=o.metric_type WHERE m.key IS NULL'
).all();
check('every observation.metric_type exists in metric_types', orphans.length === 0,
  orphans.length ? 'orphans: ' + orphans.map(o => o.metric_type).join(',') : 'none');

console.log('\n=== 6. UNIQUE-key integrity (no duplicate source/external_id/metric) ===');
const dups = core.prepare(
  'SELECT source, external_id, metric_type, COUNT(*) c FROM observations GROUP BY source, external_id, metric_type HAVING c>1'
).all();
check('no duplicate observation keys', dups.length === 0, dups.length ? `${dups.length} dup groups` : 'none');

console.log('\n=== 7. spot reconciliation: recompute from source, compare to core ===');
// 7a. every weight row
let wOk = true, wDetail = '';
for (const w of shred.prepare('SELECT day, kg FROM weights').all()) {
  const date = dayToDate(startDate, w.day);
  const c = core.prepare("SELECT value FROM observations WHERE metric_type='body.weight' AND external_id=?").get('weights:' + w.day);
  if (!c || Number(c.value) !== Number(w.kg)) { wOk = false; wDetail += ` day${w.day}(src=${w.kg},core=${c?.value})`; }
}
check('weights reconcile (value + date) for all rows', wOk, wDetail || `${wDays.length} rows`);

// 7b. one foods day recomputed
const fSample = shred.prepare('SELECT day, value FROM foods ORDER BY day LIMIT 1').get();
const ft = nutritionTotals(JSON.parse(fSample.value), getProduct);
const fdate = dayToDate(startDate, fSample.day);
const fRows = Object.fromEntries(core.prepare(
  "SELECT metric_type, value FROM observations WHERE external_id=? AND metric_type LIKE 'nutrition.%'"
).all('foods-day:' + fdate).map(r => [r.metric_type, r.value]));
const fOk = round2(ft.kcal) === fRows['nutrition.calories'] && round2(ft.p) === fRows['nutrition.protein'] &&
  round2(ft.c) === fRows['nutrition.carbs'] && round2(ft.f) === fRows['nutrition.fat'];
check(`foods day ${fSample.day} (${fdate}) macros reconcile`, fOk,
  `recomputed kcal=${round2(ft.kcal)} p=${round2(ft.p)} c=${round2(ft.c)} f=${round2(ft.f)} | core=${JSON.stringify(fRows)}`);

// 7c. one sets day recomputed
const vDay = vDays[0];
const vArrs = setByDay.get(vDay);
const vExpect = round2(setsVolume(vArrs));
const vdate = dayToDate(startDate, vDay);
const vCore = core.prepare("SELECT value FROM observations WHERE metric_type='fitness.session_volume' AND external_id=?").get('session:' + vdate);
check(`sets day ${vDay} (${vdate}) volume reconcile`, vCore && vCore.value === vExpect,
  `recomputed=${vExpect} core=${vCore?.value}`);

console.log('\n=== 8. provenance: all backfilled rows tagged imported_by=backfill ===');
const tagged = core.prepare("SELECT COUNT(*) c FROM observations WHERE json_extract(metadata,'$.imported_by')='backfill'").get().c;
const total = core.prepare('SELECT COUNT(*) c FROM observations').get().c;
check('every row carries backfill provenance', tagged === total, `tagged=${tagged}/${total}`);

shred.close(); core.close();
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
