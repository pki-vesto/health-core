// Consistent, non-destructive online backup of the canonical Health Core DB.
// The source is opened read-only; SQLite's backup API copies a coherent file
// while the live API can keep serving readers/writers under WAL.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

export function backupDestination(now = new Date()) {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
  return join(ROOT, 'snapshots', `core.db.backup-${stamp}`);
}

export function verifyCoreBackup(path) {
  const snap = new Database(path, { readonly: true, fileMustExist: true });
  try {
    return snap.prepare(
      `SELECT
         (SELECT COUNT(*) FROM observations) AS observations,
         (SELECT COUNT(*) FROM metric_types) AS metric_types,
         (SELECT COUNT(*) FROM sources) AS sources`
    ).get();
  } finally {
    snap.close();
  }
}

export async function backupCore({ srcPath, destPath, now = new Date() } = {}) {
  const src = srcPath || process.env.CORE_DB || join(ROOT, 'data', 'core.db');
  const dest = destPath || process.env.CORE_BACKUP_OUT || backupDestination(now);
  mkdirSync(dirname(dest), { recursive: true });

  const db = new Database(src, { readonly: true, fileMustExist: true });
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }

  return { src, dest, counts: verifyCoreBackup(dest), now };
}

export function amsterdamLogTime(date) {
  return new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const out = await backupCore();
    console.log(`core backup OK -> ${out.dest}`);
    console.log(`source: ${out.src}`);
    console.log(`created_at_amsterdam: ${amsterdamLogTime(out.now)}`);
    console.log(`verify: observations=${out.counts.observations} metric_types=${out.counts.metric_types} sources=${out.counts.sources}`);
  } catch (e) {
    console.error(`core backup failed: ${e.message}`);
    process.exit(1);
  }
}
