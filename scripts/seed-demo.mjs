// Build + seed a standalone DEMO Core DB (never the live one) for live-server
// tests (smoke, auth, Playwright) and manual UI inspection.
//
//   node scripts/seed-demo.mjs [dbpath=/tmp/demo-core.db] [days=60]
//
// Bootstraps exactly like production (coredb schema + seed, then migrations) and
// fills all domains with deterministic data via test/seed-domains.mjs.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA, seed } from './lib/coredb.mjs';
import { seedAllDomains } from '../api/test/seed-domains.mjs';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
const HERE = dirname(fileURLToPath(import.meta.url));
const MIG = join(HERE, '..', 'migrations');

const path = process.argv[2] || '/tmp/demo-core.db';
const days = parseInt(process.argv[3] || '60', 10);
for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });

const db = new Database(path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(SCHEMA);
seed(db, { measurements: false, rpe: false });
for (const f of readdirSync(MIG).filter(f => /^\d+.*\.sql$/.test(f)).sort()) db.exec(readFileSync(join(MIG, f), 'utf8'));

seedAllDomains(db, { days });
const n = db.prepare('SELECT COUNT(*) AS n FROM observations').get().n;
const m = db.prepare("SELECT COUNT(*) AS n FROM metric_types WHERE status='active'").get().n;
db.close();
console.log(`seeded demo DB at ${path}: ${n} observations across ${m} metrics, ${days} days`);
