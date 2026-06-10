// Consistent, non-destructive snapshot of shred.db using SQLite's online backup
// API. Source is opened read-only, so the live DB is never modified; the backup
// API produces a single coherent file even though shred.db is in WAL mode.
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const src = process.env.SHRED_DB || '/data/shred.db';
const dest = process.env.SNAPSHOT_OUT; // e.g. /health-core/snapshots/shred.db.snapshot-<ts>
if (!dest) { console.error('SNAPSHOT_OUT not set'); process.exit(1); }

const db = new Database(src, { readonly: true });
await db.backup(dest);
db.close();

// Verify the snapshot opens and report a row count we can sanity-check.
const snap = new Database(dest, { readonly: true });
const w = snap.prepare('SELECT COUNT(*) c FROM weights').get().c;
const f = snap.prepare('SELECT COUNT(*) c FROM foods').get().c;
const s = snap.prepare('SELECT COUNT(*) c FROM sets').get().c;
snap.close();
console.log(`snapshot OK -> ${dest}`);
console.log(`verify: weights=${w} foods=${f} sets=${s}`);
