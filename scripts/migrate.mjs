// Health Core migration runner (goal 13).
//
// Applies numbered migrations/*.sql in order, once each, inside a transaction,
// recording version + sha256 checksum + applied_at in schema_migrations. Safe to
// re-run (idempotent): already-applied versions are skipped. Detects drift (a
// file whose checksum no longer matches what was applied) and refuses silently
// to "re-apply" — it warns, because migrations are immutable once shipped.
//
// Usage (inside the api image, which has better-sqlite3):
//   node scripts/migrate.mjs            # apply pending
//   node scripts/migrate.mjs --status   # show applied/pending, no changes
//   node scripts/migrate.mjs --dry-run  # show what WOULD apply, no changes
//
// ADDITIVE-ONLY: see migrations/001_baseline.sql header.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, '..', 'migrations');
const CORE_DB = process.env.CORE_DB || join(HERE, '..', 'data', 'core.db');

const args = new Set(process.argv.slice(2));
const STATUS = args.has('--status');
const DRY = args.has('--dry-run');

function sha256(s) { return createHash('sha256').update(s).digest('hex'); }

function loadMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d+.*\.sql$/.test(f))
    .sort()
    .map(f => {
      const sql = readFileSync(join(MIGRATIONS_DIR, f), 'utf8');
      return { version: f.match(/^(\d+)/)[1], file: f, sql, checksum: sha256(sql) };
    });
}

const db = new Database(CORE_DB);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  file       TEXT NOT NULL,
  checksum   TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

const applied = new Map(db.prepare('SELECT version, file, checksum, applied_at FROM schema_migrations').all().map(r => [r.version, r]));
const migrations = loadMigrations();

if (STATUS) {
  console.log('version  status    file');
  for (const m of migrations) {
    const a = applied.get(m.version);
    const drift = a && a.checksum !== m.checksum ? '  ⚠ DRIFT' : '';
    console.log(`${m.version.padEnd(8)} ${(a ? 'applied' : 'pending').padEnd(9)} ${m.file}${drift}${a ? '  @ ' + a.applied_at : ''}`);
  }
  db.close();
  process.exit(0);
}

const record = db.prepare('INSERT INTO schema_migrations (version, file, checksum) VALUES (?, ?, ?)');
let appliedCount = 0, drift = 0;

for (const m of migrations) {
  const a = applied.get(m.version);
  if (a) {
    if (a.checksum !== m.checksum) {
      drift++;
      console.warn(`⚠ ${m.file}: checksum changed since it was applied — migrations are immutable; create a NEW migration instead of editing this one.`);
    }
    continue;
  }
  if (DRY) { console.log(`would apply: ${m.file}`); appliedCount++; continue; }
  const tx = db.transaction(() => { db.exec(m.sql); record.run(m.version, m.file, m.checksum); });
  tx();
  console.log(`applied: ${m.file}`);
  appliedCount++;
}

db.close();
console.log(DRY
  ? `dry-run: ${appliedCount} migration(s) pending${drift ? `, ${drift} drift warning(s)` : ''}`
  : `done: ${appliedCount} applied${drift ? `, ${drift} drift warning(s)` : ''}`);
