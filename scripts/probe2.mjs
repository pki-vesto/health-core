import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
const db = new Database(process.env.SHRED_DB || '/data/shred.db', { readonly: true });

console.log('=== meta (full) ===');
for (const r of db.prepare('SELECT * FROM meta').all()) {
  console.log(`key=${r.key} updated_at=${r.updated_at}`);
  console.log('value:', r.value);
}

console.log('\n=== products schema + sample ===');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='products'").get().sql);
const seedInDb = db.prepare("SELECT COUNT(*) c FROM products WHERE id LIKE 'seed:%'").get().c;
console.log('products with seed: prefix in DB:', seedInDb, 'of', db.prepare('SELECT COUNT(*) c FROM products').get().c);
console.log('-- 3 sample products --');
for (const p of db.prepare('SELECT * FROM products LIMIT 3').all()) {
  console.log(`id=${p.id}`); console.log('value:', p.value);
}
console.log('-- does seed:ei-heel exist? --');
const ei = db.prepare("SELECT * FROM products WHERE id='seed:ei-heel'").get();
console.log(ei ? ei.value : 'NOT IN DB');

console.log('\n=== day_log sample ===');
for (const r of db.prepare('SELECT * FROM day_log ORDER BY day LIMIT 4').all()) {
  console.log(`day=${r.day} completed=${r.completed} notes=${r.notes} updated_at=${r.updated_at}`);
}

console.log('\n=== distinct days present per table ===');
console.log('weights days:', JSON.stringify(db.prepare('SELECT day FROM weights ORDER BY day').all().map(r=>r.day)));
console.log('foods days  :', JSON.stringify(db.prepare('SELECT day FROM foods ORDER BY day').all().map(r=>r.day)));
console.log('sets days   :', JSON.stringify(db.prepare('SELECT DISTINCT day FROM sets ORDER BY day').all().map(r=>r.day)));
db.close();
