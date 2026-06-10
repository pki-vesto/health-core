// Step 1 + Step 2: create core.db schema and seed sources + metric_types v1.
// Conditional catalog entries are decided by inspecting shred.db (read-only).
// Idempotent: safe to re-run.
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
import { openCore, ensureSchema, seed } from './lib/coredb.mjs';

const SHRED_DB = process.env.SHRED_DB || '/data/shred.db';
const CORE_DB = process.env.CORE_DB || '/health-core/data/core.db';

// ── Detect conditional facts from shred.db ──────────────────────────────────
const shred = new Database(SHRED_DB, { readonly: true });

const weightCols = shred.prepare('PRAGMA table_info(weights)').all().map(c => c.name);
const measureCols = weightCols.filter(c => !['day', 'kg', 'updated_at'].includes(c));
const hasMeasurements = measureCols.length > 0;

// RPE: scan all sets rows for an 'rpe' (or 'rpe'-like) field on any set object.
let hasRpe = false;
for (const row of shred.prepare('SELECT sets FROM sets').all()) {
  let arr; try { arr = JSON.parse(row.sets); } catch { continue; }
  if (Array.isArray(arr) && arr.some(s => s && (s.rpe != null || s.RPE != null))) { hasRpe = true; break; }
}
shred.close();

const facts = { measurements: hasMeasurements, rpe: hasRpe };

// ── Build schema + seed ─────────────────────────────────────────────────────
const core = openCore(CORE_DB);
ensureSchema(core);
const seededKeys = seed(core, facts);
core.close();

console.log('=== init-db ===');
console.log('core.db       :', CORE_DB);
console.log('weights cols  :', weightCols.join(', '));
console.log('measurements  :', hasMeasurements, hasMeasurements ? `(${measureCols.join(',')})` : '(weight only)');
console.log('rpe in sets   :', hasRpe);
console.log('seeded metrics:', seededKeys.join(', '));
console.log('done.');
