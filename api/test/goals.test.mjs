// Goal progress/adherence read model (issue #35). Fixture tests keep the read
// path deterministic: no writes during progress computation, explicit today,
// and source-precedence conflicts locked to ADR-008.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import express from 'express';
import { buildDb, closeDb, insertObs, seedDaily, harness } from './fixtures.mjs';
import {
  evaluateComparator, percentToTarget, resolveDailyValue, goalProgress
} from '../lib/goals.js';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const TODAY = '2026-06-20';

export async function run() {
  const t = harness('goal progress + streaks (#35)');

  t.eq('gte comparator met/not/null', [
    evaluateComparator(120, 'gte', { value: 100 }),
    evaluateComparator(90, 'gte', { value: 100 }),
    evaluateComparator(null, 'gte', { value: 100 })
  ], [true, false, null]);
  t.eq('lte/eq/range comparators', [
    evaluateComparator(79, 'lte', { value: 80 }),
    evaluateComparator(80.1, 'eq', { value: 80, tolerance: 0.2 }),
    evaluateComparator(82, 'range', { min: 80, max: 85 }),
    evaluateComparator(90, 'range', { min: 80, max: 85 })
  ], [true, true, true, false]);
  t.eq('percent-to-target variants', [
    percentToTarget(75, 'gte', { value: 100 }),
    percentToTarget(125, 'gte', { value: 100 }),
    percentToTarget(80, 'lte', { value: 80 }),
    percentToTarget(100, 'lte', { value: 80 }),
    percentToTarget(82, 'range', { min: 80, max: 85 }),
    percentToTarget(70, 'range', { min: 80, max: 85 }),
    percentToTarget(1, 'eq', { value: 1 })
  ], [0.75, 1.25, 1, 0.8, 1, 0.875, null]);

  {
    const db = buildDb();
    insertObs(db, { metric: 'nutrition.protein', date: TODAY, value: 90, source: 'shred', sourceUpdatedAt: '2026-06-20T20:00:00.000Z' });
    insertObs(db, { metric: 'nutrition.protein', date: TODAY, value: 110, source: 'manual', sourceUpdatedAt: '2026-06-20T08:00:00.000Z' });
    const row = resolveDailyValue(db, 'nutrition.protein', TODAY);
    t.eq('daily value uses ADR-008 precedence', { value: row.value, source: row.source }, { value: 110, source: 'manual' });
    closeDb(db);
  }

  {
    const db = buildDb();
    addGoal(db, { title: 'Protein', metric: 'nutrition.protein', comparator: 'gte', value: 120, window: 'daily' });
    insertObs(db, { metric: 'nutrition.protein', date: TODAY, value: 130 });
    const g = goalProgress(db, { today: TODAY })[0];
    t.eq('met today goal status', pick(g), { current_value: 130, met_today: true, percent_to_target: 1.0833, status: 'on_track' });
    closeDb(db);
  }

  {
    const db = buildDb();
    addGoal(db, { title: 'Protein', metric: 'nutrition.protein', comparator: 'gte', value: 120, window: 'daily' });
    insertObs(db, { metric: 'nutrition.protein', date: TODAY, value: 90 });
    const g = goalProgress(db, { today: TODAY })[0];
    t.eq('not-met today goal status', pick(g), { current_value: 90, met_today: false, percent_to_target: 0.75, status: 'off_track' });
    closeDb(db);
  }

  {
    const db = buildDb();
    addGoal(db, { title: 'Weight range', metric: 'body.weight', comparator: 'range', min: 78, max: 82, window: 'latest' });
    insertObs(db, { metric: 'body.weight', date: '2026-06-19', value: 84 });
    const g = goalProgress(db, { today: TODAY })[0];
    t.eq('latest range goal progress', pick(g), { current_value: 84, met_today: null, percent_to_target: 0.9762, status: 'off_track' });
    closeDb(db);
  }

  {
    const db = buildDb();
    addGoal(db, { title: 'Protein streak', metric: 'nutrition.protein', comparator: 'gte', value: 100, window: 'daily' });
    seedDaily(db, 'nutrition.protein', '2026-06-16', [100, 110, 120, 130, 140]);
    const g = goalProgress(db, { today: TODAY })[0];
    t.eq('five-day current and longest streak', { current: g.current_streak, longest: g.longest_streak }, { current: 5, longest: 5 });
    closeDb(db);
  }

  {
    const db = buildDb();
    addGoal(db, { title: 'Protein streak gap', metric: 'nutrition.protein', comparator: 'gte', value: 100, window: 'daily' });
    seedDaily(db, 'nutrition.protein', '2026-06-16', [100, 110, null, 130, 140]);
    const g = goalProgress(db, { today: TODAY })[0];
    t.eq('missing-data day breaks streak', { current: g.current_streak, longest: g.longest_streak, breaks: g.missing_data_breaks_streak }, { current: 2, longest: 2, breaks: true });
    closeDb(db);
  }

  {
    const db = buildDb();
    addGoal(db, { title: 'No data', metric: 'nutrition.protein', comparator: 'gte', value: 100, window: 'daily' });
    const g = goalProgress(db, { today: TODAY })[0];
    t.eq('no-data goal empty state', {
      current_value: g.current_value, met_today: g.met_today, percent_to_target: g.percent_to_target,
      status: g.status, current_streak: g.current_streak, longest_streak: g.longest_streak
    }, { current_value: null, met_today: null, percent_to_target: null, status: 'no_data', current_streak: 0, longest_streak: 0 });
    closeDb(db);
  }

  await routeTests(t);

  return t.summary();
}

function addGoal(db, { title, metric, comparator, value = null, min = null, max = null, window = 'latest', status = 'active' }) {
  return db.prepare(`
    INSERT INTO user_health_goals (title, metric_key, comparator, target_value, target_min, target_max, window, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, metric, comparator, value, min, max, window, status).lastInsertRowid;
}

function pick(g) {
  return {
    current_value: g.current_value,
    met_today: g.met_today,
    percent_to_target: g.percent_to_target,
    status: g.status
  };
}

async function routeTests(t) {
  const tmp = buildDb();
  const path = tmp.__path;
  const id = addGoal(tmp, { title: 'Protein route', metric: 'nutrition.protein', comparator: 'gte', value: 100, window: 'daily' });
  insertObs(tmp, { metric: 'nutrition.protein', date: tmp.prepare("SELECT date('now') AS d").get().d, value: 125 });
  try { tmp.close(); } catch {}

  process.env.CORE_DB = path;
  const { __resetForTests } = await import('../db.js');
  __resetForTests();
  const { userGoalsProgress } = await import('../routes/user-goals-progress.js?ts=' + Date.now());

  const app = express();
  app.use('/api/v1', userGoalsProgress);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  try {
    const all = await fetch(`${base}/user-goals/progress`).then(r => r.json());
    t.ok('route all active returns progress array', Array.isArray(all.goals) && all.goals.length === 1 && all.goals[0].metric_key === 'nutrition.protein');
    const one = await fetch(`${base}/user-goals/${id}/progress`).then(r => r.json());
    t.eq('route one returns goal', one.goal.id, Number(id));
    t.eq('route bad id → 400', (await fetch(`${base}/user-goals/abc/progress`)).status, 400);
    t.eq('route unknown id → 404', (await fetch(`${base}/user-goals/9999/progress`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().then(failed => process.exit(failed ? 1 : 0));
}
