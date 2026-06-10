// Automated governance consistency check (task #20).
//
// Verifies the control-plane docs agree with each other and with reality:
//   • BACKLOG.md JSON   — 250 goals, numbered 1..250, all completed
//   • FEATURE_AUDIT.md  — 250 entries 1..250; header summary == actual counts
//   • ROADMAP.md        — registered/completed totals == registry
//   • NEXT_TASKS.md     — contiguous numbered queue
//   • goal registry DB  — 250 goals all complete (from a fresh bootstrap)
//   • schema.sql        — matches generated DDL (no drift)
//   • cross-check       — BACKLOG ids == AUDIT ids == DB ids == 1..250
//
//   node scripts/governance-check.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb } from '../api/test/fixtures.mjs';
import { generate as generateSchema } from './dump-schema.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const jsonBlock = (md) => { const m = md.match(/```json\s*([\s\S]*?)```/); if (!m) throw new Error('no JSON block'); return JSON.parse(m[1]); };
const seq = (n) => Array.from({ length: n }, (_, i) => i + 1);

let pass = 0, fail = 0;
const ok = (n, c, d = '') => c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.error(`  ✗ ${n}${d ? ' — ' + d : ''}`));
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

console.log('governance consistency check');

// ── BACKLOG ──────────────────────────────────────────────────────────────────
const backlog = jsonBlock(read('docs/BACKLOG.md'));
const backlogIds = backlog.map(g => g.number).sort((a, b) => a - b);
ok('BACKLOG has 250 goals', backlog.length === 250, `got ${backlog.length}`);
ok('BACKLOG numbered 1..250', sameSet(backlogIds, seq(250)));
ok('BACKLOG all completed', backlog.every(g => g.status === 'completed'), `${backlog.filter(g => g.status !== 'completed').length} not completed`);

// ── FEATURE_AUDIT ────────────────────────────────────────────────────────────
const auditMd = read('audit/FEATURE_AUDIT.md');
const audit = jsonBlock(auditMd);
const auditIds = audit.map(g => g.number).sort((a, b) => a - b);
ok('AUDIT has 250 entries', audit.length === 250, `got ${audit.length}`);
ok('AUDIT numbered 1..250', sameSet(auditIds, seq(250)));

// header summary must equal the actual classification counts
const summary = {};
for (const m of auditMd.matchAll(/^-\s+([\w-]+):\s+(\d+)$/gm)) summary[m[1]] = Number(m[2]);
const actual = {};
for (const g of audit) actual[g.classification] = (actual[g.classification] || 0) + 1;
const summaryMatches = Object.keys(summary).every(k => (summary[k] || 0) === (actual[k] || 0))
  && Object.keys(actual).every(k => (summary[k] || 0) === (actual[k] || 0));
ok('AUDIT header summary matches its data', summaryMatches, `summary=${JSON.stringify(summary)} actual=${JSON.stringify(actual)}`);
ok('AUDIT summary totals 250', Object.values(summary).reduce((a, b) => a + b, 0) === 250, `got ${Object.values(summary).reduce((a, b) => a + b, 0)}`);

// ── ROADMAP ──────────────────────────────────────────────────────────────────
const roadmap = read('docs/ROADMAP.md');
ok('ROADMAP registers 250 goals', /Registered goals:\s*250/.test(roadmap));
ok('ROADMAP reports 250 completed', /Registry status:\s*250 completed/.test(roadmap));

// ── NEXT_TASKS ───────────────────────────────────────────────────────────────
const nextNums = [...read('runtime/NEXT_TASKS.md').matchAll(/^(\d+)\.\s+/gm)].map(m => Number(m[1]));
ok('NEXT_TASKS is a non-empty queue', nextNums.length > 0);
ok('NEXT_TASKS numbered contiguously from 1', sameSet(nextNums, seq(nextNums.length)), JSON.stringify(nextNums));

// ── goal registry (DB) ───────────────────────────────────────────────────────
const db = buildDb();
const dbIds = db.prepare('SELECT id FROM health_goals ORDER BY id').all().map(r => r.id);
const dbComplete = db.prepare("SELECT COUNT(*) n FROM health_goals WHERE status='complete'").get().n;
const schemaCurrent = (() => { try { return read('schema.sql'); } catch { return ''; } })();
const schemaGenerated = generateSchema();
closeDb(db);

ok('registry has 250 goals', dbIds.length === 250, `got ${dbIds.length}`);
ok('registry all complete', dbComplete === 250, `got ${dbComplete}`);
ok('registry ids 1..250', sameSet(dbIds, seq(250)));

// ── cross-check ──────────────────────────────────────────────────────────────
ok('BACKLOG == AUDIT == registry ids', sameSet(backlogIds, auditIds) && sameSet(backlogIds, dbIds));

// ── schema.sql freshness ─────────────────────────────────────────────────────
ok('schema.sql is up to date', schemaCurrent === schemaGenerated, 'run node scripts/dump-schema.mjs');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
