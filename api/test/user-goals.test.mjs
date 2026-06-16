// HTTP route tests for /api/v1/user-goals (issue #34).
//
// Boots the user-goals router in-process against a temp core DB so we exercise
// the actual Express handlers, including:
//   - create for each comparator (lte/gte/eq/range),
//   - rejection of unknown metric_key, missing target fields, invalid deadline,
//   - list (with and without ?status= filter), get by id, 404 on missing,
//   - PATCH edits (label, target_value, status transitions) and re-validation
//     when comparator changes,
//   - regression guard: /api/v1/goals (dev registry) still returns the legacy
//     shape — the new namespace did not collide,
//   - migration idempotency: running the migration twice does not error.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import express from 'express';
import { buildDb, harness } from './fixtures.mjs';
import * as hos from '../lib/health-os.js';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const HERE = dirname(fileURLToPath(import.meta.url));
const MIG_PATH = join(HERE, '..', '..', 'migrations', '010_user_health_goals.sql');

async function boot() {
  const tmp = buildDb();
  const path = tmp.__path;
  try { tmp.close(); } catch {}
  process.env.CORE_DB = path;
  // Earlier suites in the unit aggregator may have already opened db()/writeDb()
  // against a different temp DB; reset the singletons so the route opens the
  // path we just set.
  const { __resetForTests } = await import('../db.js');
  __resetForTests();
  // Re-import the router so any cached binding is fresh as well.
  const { userGoals } = await import('../routes/user-goals.js?ts=' + Date.now());
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1', userGoals);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return { server, path, base: `http://127.0.0.1:${server.address().port}` };
}

async function post(base, body) {
  const r = await fetch(`${base}/api/v1/user-goals`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json() };
}

async function patch(base, id, body) {
  const r = await fetch(`${base}/api/v1/user-goals/${id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json() };
}

export async function run() {
  const t = harness('user-goals routes (#34)');

  const { server, path, base } = await boot();
  try {
    // ── Create — each comparator ─────────────────────────────────────────────
    const cLte = await post(base, { metric_key: 'heart.resting_rate', comparator: 'lte', target_value: 55, label: 'Resting HR < 55' });
    t.eq('create lte returns 201', cLte.status, 201);
    t.eq('create lte echoes back comparator+target_value+status',
      { comparator: cLte.json.goal?.comparator, target_value: cLte.json.goal?.target_value, status: cLte.json.goal?.status },
      { comparator: 'lte', target_value: 55, status: 'active' });

    const cGte = await post(base, { metric_key: 'nutrition.protein', comparator: 'gte', target_value: 140 });
    t.eq('create gte returns 201', cGte.status, 201);

    const cEq = await post(base, { metric_key: 'sleep.duration', comparator: 'eq', target_value: 8 });
    t.eq('create eq returns 201', cEq.status, 201);

    const cRange = await post(base, { metric_key: 'body.weight', comparator: 'range', target_low: 78, target_high: 80, deadline: '2026-09-30' });
    t.eq('create range returns 201', cRange.status, 201);
    t.eq('range goal stores low+high+deadline',
      { low: cRange.json.goal?.target_low, high: cRange.json.goal?.target_high, deadline: cRange.json.goal?.deadline },
      { low: 78, high: 80, deadline: '2026-09-30' });

    // ── Reject unknown metric_key ────────────────────────────────────────────
    const badMetric = await post(base, { metric_key: 'bogus.metric', comparator: 'lte', target_value: 1 });
    t.eq('unknown metric_key → 400', badMetric.status, 400);
    t.eq('unknown metric_key carries unknown_metric_key code', badMetric.json.code, 'unknown_metric_key');

    // ── Reject missing/inconsistent target fields ────────────────────────────
    const rangeMissingHigh = await post(base, { metric_key: 'body.weight', comparator: 'range', target_low: 78 });
    t.eq('range without target_high → 400', rangeMissingHigh.status, 400);

    const lteMissingValue = await post(base, { metric_key: 'heart.resting_rate', comparator: 'lte' });
    t.eq('lte without target_value → 400', lteMissingValue.status, 400);

    const lteWithRange = await post(base, { metric_key: 'heart.resting_rate', comparator: 'lte', target_value: 55, target_low: 50 });
    t.eq('lte with stray target_low → 400', lteWithRange.status, 400);

    const rangeInverted = await post(base, { metric_key: 'body.weight', comparator: 'range', target_low: 90, target_high: 80 });
    t.eq('range with low>high → 400', rangeInverted.status, 400);

    // ── Reject invalid comparator / status / deadline ───────────────────────
    const badCmp = await post(base, { metric_key: 'body.weight', comparator: 'between', target_value: 1 });
    t.eq('invalid comparator → 400', badCmp.status, 400);

    const badStatus = await post(base, { metric_key: 'body.weight', comparator: 'lte', target_value: 80, status: 'done' });
    t.eq('invalid status → 400', badStatus.status, 400);

    const badDeadline = await post(base, { metric_key: 'body.weight', comparator: 'lte', target_value: 80, deadline: '2026-13-40' });
    t.eq('invalid deadline → 400', badDeadline.status, 400);

    const badDeadlineShape = await post(base, { metric_key: 'body.weight', comparator: 'lte', target_value: 80, deadline: '30/09/2026' });
    t.eq('non-ISO deadline → 400', badDeadlineShape.status, 400);

    // ── GET list — no filter and ?status=active / ?status=retired ───────────
    const listAll = await fetch(`${base}/api/v1/user-goals`).then(r => r.json());
    t.eq('list returns the four created goals', listAll.goals.length, 4);
    t.ok('list ordered DESC by created_at (most recent first by id)',
      listAll.goals[0].id > listAll.goals[listAll.goals.length - 1].id);

    const listActive = await fetch(`${base}/api/v1/user-goals?status=active`).then(r => r.json());
    t.eq('?status=active matches all four (default status)', listActive.goals.length, 4);

    const listRetired = await fetch(`${base}/api/v1/user-goals?status=retired`).then(r => r.json());
    t.eq('?status=retired empty before any retire', listRetired.goals.length, 0);

    const listBad = await fetch(`${base}/api/v1/user-goals?status=ghost`);
    t.eq('unknown status filter → 400', listBad.status, 400);

    // ── GET :id — 200 and 404 ────────────────────────────────────────────────
    const lteId = cLte.json.goal.id;
    const oneOk = await fetch(`${base}/api/v1/user-goals/${lteId}`).then(r => r.json());
    t.eq('GET /:id returns the goal', oneOk.goal.id, lteId);

    const oneMiss = await fetch(`${base}/api/v1/user-goals/9999`);
    t.eq('GET unknown id → 404', oneMiss.status, 404);

    const oneBadId = await fetch(`${base}/api/v1/user-goals/abc`);
    t.eq('GET non-numeric id → 400', oneBadId.status, 400);

    // ── PATCH edit (label + target_value) + updated_at advances ──────────────
    // Force a measurable updated_at delta by sleeping past the 1-second
    // datetime('now') resolution before patching.
    await new Promise(r => setTimeout(r, 1100));
    const editLabel = await patch(base, lteId, { label: 'Resting HR < 55 bpm', target_value: 54 });
    t.eq('PATCH label+target_value returns 200', editLabel.status, 200);
    t.eq('PATCH applied to label+target_value',
      { label: editLabel.json.goal.label, target_value: editLabel.json.goal.target_value },
      { label: 'Resting HR < 55 bpm', target_value: 54 });
    t.ok('PATCH advances updated_at past created_at',
      editLabel.json.goal.updated_at > editLabel.json.goal.created_at,
      `created=${editLabel.json.goal.created_at} updated=${editLabel.json.goal.updated_at}`);

    // ── PATCH status — paused → achieved → retired → active (no row delete) ──
    let n0 = countRows(path);
    for (const s of ['paused', 'achieved', 'retired', 'active']) {
      const r = await patch(base, lteId, { status: s });
      t.eq(`PATCH status=${s} ok`, r.json.goal.status, s);
    }
    t.eq('no row deletions through status churn', countRows(path), n0);

    // ── PATCH that switches comparator — must re-validate value fields ──────
    const switchBad = await patch(base, lteId, { comparator: 'range' });
    t.eq('comparator switch lte→range without low/high → 400', switchBad.status, 400);

    const switchOk = await patch(base, lteId, { comparator: 'range', target_value: null, target_low: 50, target_high: 60 });
    t.eq('comparator switch with low/high + cleared target_value → 200', switchOk.status, 200);
    t.eq('comparator switch persisted',
      { comparator: switchOk.json.goal.comparator, low: switchOk.json.goal.target_low, high: switchOk.json.goal.target_high, target_value: switchOk.json.goal.target_value },
      { comparator: 'range', low: 50, high: 60, target_value: null });

    // ── Empty PATCH body → 400 ───────────────────────────────────────────────
    const empty = await patch(base, lteId, {});
    t.eq('empty PATCH body → 400', empty.status, 400);

    // ── Listing filter sees the retired/active state after churn ────────────
    const listActive2 = await fetch(`${base}/api/v1/user-goals?status=active`).then(r => r.json());
    t.eq('?status=active now counts the three untouched + 1 churned back to active', listActive2.goals.length, 4);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });
  }

  // ── Legacy /api/v1/goals + /progress untouched (regression guard) ─────────
  {
    const db = buildDb();
    const goals = hos.healthGoals(db);
    t.ok('legacy healthGoals() still returns the dev registry shape',
      Array.isArray(goals.goals) && goals.goals.length === 250 && goals.goals[0].title != null,
      `goals=${goals.goals?.length}`);
    const progress = hos.progress(db);
    t.ok('legacy progress() still returns status counts',
      progress && progress.goals && progress.goals.complete === 250,
      JSON.stringify(progress));
    try { db.close(); } catch {}
    for (const ext of ['', '-wal', '-shm']) rmSync(db.__path + ext, { force: true });
  }

  // ── Migration idempotency: applying 009 twice on a built DB is a no-op ───
  {
    const db = buildDb();
    const sql = readFileSync(MIG_PATH, 'utf8');
    let threw = null;
    try { db.exec(sql); db.exec(sql); } catch (e) { threw = e; }
    t.ok('migration 009 is idempotent on an already-migrated DB', threw == null,
      threw ? threw.message : '');
    // Schema unchanged: column count still matches the original migration.
    const cols = db.prepare("PRAGMA table_info('user_health_goals')").all().map(c => c.name);
    t.eq('user_health_goals columns intact after re-run', cols, [
      'id', 'metric_key', 'comparator', 'target_value', 'target_low', 'target_high',
      'window', 'deadline', 'status', 'label', 'created_at', 'updated_at'
    ]);
    try { db.close(); } catch {}
    for (const ext of ['', '-wal', '-shm']) rmSync(db.__path + ext, { force: true });
  }

  return t.summary();
}

function countRows(path) {
  const d = new Database(path);
  try {
    return d.prepare('SELECT COUNT(*) AS n FROM user_health_goals').get().n;
  } finally { d.close(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().then(failed => process.exit(failed ? 1 : 0));
}
