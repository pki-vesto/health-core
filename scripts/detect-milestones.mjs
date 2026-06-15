import { createRequire } from 'node:module';
import { detectMilestones } from '../api/lib/milestones.js';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const path = process.env.CORE_DB || '/core/core.db';
const db = new Database(path, { fileMustExist: true });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 10000');

try {
  const out = detectMilestones(db, db);
  console.log(JSON.stringify({ core_db: path, detected: out.detected, written: out.written }, null, 2));
} finally {
  db.close();
}
