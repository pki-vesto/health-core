// Generate schema.sql from the real bootstrap (coredb schema + migrations), so
// the reference DDL can never drift from what the code actually creates (task #19).
//
//   node scripts/dump-schema.mjs            # writes ../schema.sql
//   node scripts/dump-schema.mjs --check    # exit 1 if ../schema.sql is stale
//
// schema_migrations is created at runtime by scripts/migrate.mjs (not a migration
// file), so it is documented in the header rather than emitted here.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb } from '../api/test/fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'schema.sql');
const CHECK = process.argv.includes('--check');

export function generate() {
  const db = buildDb();
  const objs = db.prepare(
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
  ).all();
  closeDb(db);

  const tables = objs.filter(o => o.type === 'table').sort((a, b) => a.name.localeCompare(b.name));
  const indexes = objs.filter(o => o.type === 'index');

  let out = `-- Health Core schema — GENERATED, do not edit by hand.\n`;
  out += `-- Source of truth: scripts/lib/coredb.mjs (SCHEMA) + migrations/*.sql\n`;
  out += `-- Regenerate: node scripts/dump-schema.mjs   |   verify: --check\n`;
  out += `-- Runtime-only (created by scripts/migrate.mjs, not a migration): schema_migrations.\n`;
  out += `-- Tables: ${tables.length}, Indexes: ${indexes.length}\n\n`;

  for (const tb of tables) {
    out += `${tb.sql.trim()};\n`;
    for (const i of indexes.filter(x => x.tbl_name === tb.name).sort((a, b) => a.name.localeCompare(b.name))) {
      out += `${i.sql.trim()};\n`;
    }
    out += `\n`;
  }
  return out;
}

// CLI only — importing this module (e.g. from governance-check) must not write.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const generated = generate();
  if (CHECK) {
    let current = '';
    try { current = readFileSync(OUT, 'utf8'); } catch {}
    if (current !== generated) {
      console.error('✗ schema.sql is stale — run: node scripts/dump-schema.mjs');
      process.exit(1);
    }
    console.log('✓ schema.sql is up to date');
  } else {
    writeFileSync(OUT, generated);
    const t = (generated.match(/CREATE TABLE/g) || []).length;
    const i = (generated.match(/CREATE INDEX/g) || []).length;
    console.log(`wrote schema.sql: ${t} tables, ${i} indexes`);
  }
}
