// Reversible end-to-end test of the live dual-write. Posts throwaway records on
// an impossible program-day (9001) through the REAL running API, verifies they
// (a) land in shred.db (primary path unchanged) and (b) mirror into core.db,
// then deletes the throwaways from both DBs and confirms baselines are restored.
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const API = process.env.API || 'http://shred-api:8089';
const SHRED_DB = '/data/shred.db';
const CORE_DB = '/core/core.db';
const D = 9001;                       // throwaway program-day index
const now = Date.now();

const shred = new Database(SHRED_DB, { readonly: true });
const core = new Database(CORE_DB, { readonly: true });
const baseGet = await (await fetch(`${API}/api/sync?since=0`)).json();
const baseRecords = baseGet.records.length;
const baseWeights = shred.prepare('SELECT COUNT(*) c FROM weights').get().c;
const baseFoods = shred.prepare('SELECT COUNT(*) c FROM foods').get().c;
const baseSetsDays = shred.prepare('SELECT COUNT(DISTINCT day) c FROM sets').get().c;
const baseObs = core.prepare('SELECT COUNT(*) c FROM observations').get().c;
console.log('BASELINE  GET.records=%d weights=%d foods=%d setsDays=%d coreObs=%d',
  baseRecords, baseWeights, baseFoods, baseSetsDays, baseObs);

// ── POST throwaway records exercising all three dual-write branches ──────────
const post = {
  records: [
    { type: 'weights', key: String(D), value: 77.7, updatedAt: now },
    { type: 'foods', key: String(D),
      value: { ontbijt: [{ productId: 'seed:ei-heel', grams: 100, addedAt: now }], lunch: [], snack: [], diner: [] },
      updatedAt: now },
    { type: 'sets', key: `testex:${D}`, value: [{ w: '10', r: '5' }], updatedAt: now }
  ]
};
const resp = await (await fetch(`${API}/api/sync`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(post)
})).json();
console.log('POST resp:', JSON.stringify(resp), '(expect accepted=3)');

// ── Verify primary path: throwaways are in shred.db ─────────────────────────
const sW = shred.prepare('SELECT kg FROM weights WHERE day=?').get(D);
const sF = shred.prepare('SELECT value FROM foods WHERE day=?').get(D);
const sS = shred.prepare('SELECT sets FROM sets WHERE day=? AND ex_id=?').get(D, 'testex');
console.log('shred.db wrote: weights=%s foods=%s sets=%s',
  sW ? sW.kg + 'kg' : 'MISSING', sF ? 'yes' : 'MISSING', sS ? 'yes' : 'MISSING');

// ── Verify mirror: core.db observations for day 9001 ────────────────────────
// date(9001) computed the same way the module does.
const [y, m, d] = '2026-06-01'.split('-').map(Number);
const date = new Date(Date.UTC(y, m - 1, d) + (D - 1) * 86400000).toISOString().slice(0, 10);
const mirror = core.prepare(
  "SELECT metric_type, value, unit, timestamp, external_id, json_extract(metadata,'$.source_path') sp FROM observations WHERE timestamp=? ORDER BY metric_type"
).all(date);
console.log(`core.db mirror for day ${D} (${date}):`);
for (const r of mirror) console.log('  ', JSON.stringify(r));
const got = Object.fromEntries(mirror.map(r => [r.metric_type, r.value]));
const expect = {
  'body.weight': 77.7, 'nutrition.calories': 143, 'nutrition.protein': 13,
  'nutrition.carbs': 1, 'nutrition.fat': 10, 'fitness.session_volume': 50
};
let ok = mirror.length === 6 && mirror.every(r => r.sp === 'live');
for (const k in expect) if (got[k] !== expect[k]) ok = false;
console.log('MIRROR CHECK:', ok ? 'PASS (all 6 metrics correct, tagged source_path=live)'
  : 'FAIL expected=' + JSON.stringify(expect) + ' got=' + JSON.stringify(got));
shred.close(); core.close();

// ── Cleanup: remove throwaways from BOTH DBs, restore exact baseline ─────────
const wShred = new Database(SHRED_DB);
wShred.prepare('DELETE FROM weights WHERE day=?').run(D);
wShred.prepare('DELETE FROM foods WHERE day=?').run(D);
wShred.prepare('DELETE FROM sets WHERE day=?').run(D);
wShred.close();
const wCore = new Database(CORE_DB);
const del = wCore.prepare('DELETE FROM observations WHERE external_id IN (?,?,?)')
  .run(`weights:${D}`, `foods-day:${date}`, `session:${date}`);
wCore.close();
console.log('cleanup: removed throwaway shred rows + %d core observations', del.changes);

// ── Confirm baselines restored ───────────────────────────────────────────────
const s2 = new Database(SHRED_DB, { readonly: true });
const c2 = new Database(CORE_DB, { readonly: true });
const aGet = (await (await fetch(`${API}/api/sync?since=0`)).json()).records.length;
const aWeights = s2.prepare('SELECT COUNT(*) c FROM weights').get().c;
const aFoods = s2.prepare('SELECT COUNT(*) c FROM foods').get().c;
const aSetsDays = s2.prepare('SELECT COUNT(DISTINCT day) c FROM sets').get().c;
const aObs = c2.prepare('SELECT COUNT(*) c FROM observations').get().c;
s2.close(); c2.close();
const restored = aGet === baseRecords && aWeights === baseWeights && aFoods === baseFoods &&
  aSetsDays === baseSetsDays && aObs === baseObs;
console.log('AFTER     GET.records=%d weights=%d foods=%d setsDays=%d coreObs=%d',
  aGet, aWeights, aFoods, aSetsDays, aObs);
console.log('BASELINE RESTORED:', restored ? 'PASS (zero residue)' : 'FAIL');
process.exit((ok && restored && resp.accepted === 3) ? 0 : 1);
