// Read-only inspection of shred.db. Prints schema + samples so we can decide
// the backfill mapping. Never writes. Run inside the shred-api image so it uses
// the exact better-sqlite3 build the app uses.
import { createRequire } from 'node:module';
// better-sqlite3 lives in the image's /app/node_modules; these scripts are
// mounted outside /app, so resolve the module from there explicitly.
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const db = new Database(process.env.SHRED_DB || '/data/shred.db', { readonly: true });

const tables = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
).all().map(r => r.name);
console.log('TABLES:', tables.join(', '));

const counts = {};
for (const t of tables) {
  try { counts[t] = db.prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c; }
  catch (e) { counts[t] = 'ERR:' + e.message; }
}
console.log('COUNTS:', JSON.stringify(counts));

console.log('\n=== weights ===');
console.log('schema:', db.prepare("SELECT sql FROM sqlite_master WHERE name='weights'").get().sql);
console.log('range :', JSON.stringify(db.prepare(
  'SELECT COUNT(*) n, MIN(day) mnDay, MAX(day) mxDay, MIN(kg) mnKg, MAX(kg) mxKg FROM weights'
).get()));
console.log('sample:', JSON.stringify(db.prepare('SELECT * FROM weights ORDER BY day LIMIT 3').all()));

console.log('\n=== foods ===');
console.log('count :', db.prepare('SELECT COUNT(*) c FROM foods').get().c);
const foodRows = db.prepare('SELECT * FROM foods ORDER BY day DESC LIMIT 2').all();
for (const f of foodRows) {
  console.log(`-- day=${f.day} updated_at=${f.updated_at}`);
  console.log('value:', f.value);
}

console.log('\n=== sets ===');
console.log('count :', db.prepare('SELECT COUNT(*) c FROM sets').get().c);
console.log('distinct days:', db.prepare('SELECT COUNT(DISTINCT day) c FROM sets').get().c);
const setRows = db.prepare('SELECT * FROM sets ORDER BY day DESC LIMIT 4').all();
for (const s of setRows) {
  console.log(`-- ex_id=${s.ex_id} day=${s.day} updated_at=${s.updated_at}`);
  console.log('sets:', s.sets);
}

console.log('\n=== day encoding hint ===');
// Print min/max updated_at across tables to understand epoch units.
for (const t of ['weights', 'foods', 'sets']) {
  const r = db.prepare(`SELECT MIN(updated_at) mn, MAX(updated_at) mx FROM "${t}"`).get();
  console.log(`${t}: updated_at min=${r.mn} max=${r.mx}`);
}

db.close();
