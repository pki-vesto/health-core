// Experiment lifecycle routes (issue #27).
//
// Exercises the write path end-to-end against a temp Core DB:
// create -> active -> concluded, deterministic baseline/test verdict storage,
// validation failures, 404s, and insufficient-data degradation. Observations
// are fixture-seeded and never mutated by analysis.
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import express from 'express';
import { buildDb, harness, seedDaily } from './fixtures.mjs';

async function boot() {
  const tmp = buildDb();
  const path = tmp.__path;
  seedDaily(tmp, 'sleep.duration', '2026-01-01', [7, 8, 9]);
  seedDaily(tmp, 'sleep.duration', '2026-01-10', [8, 9, 10]);
  seedDaily(tmp, 'heart.hrv_sdnn', '2026-02-01', [50, 51]);
  seedDaily(tmp, 'heart.hrv_sdnn', '2026-02-10', [55, 56, 57]);
  const obsBefore = tmp.prepare('SELECT COUNT(*) AS n FROM observations').get().n;
  try { tmp.close(); } catch {}

  process.env.CORE_DB = path;
  const { __resetForTests } = await import('../db.js');
  __resetForTests();
  const { experiments } = await import('../routes/experiments.js?ts=' + Date.now());

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/v1', experiments);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return { server, path, obsBefore, base: `http://127.0.0.1:${server.address().port}/api/v1` };
}

async function post(base, body) {
  const r = await fetch(`${base}/experiments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json() };
}

async function patch(base, id, body) {
  const r = await fetch(`${base}/experiments/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json() };
}

export async function run() {
  const t = harness('experiments lifecycle (#27)');
  const { server, path, obsBefore, base } = await boot();

  try {
    const valid = {
      hypothesis: 'Eight hours of sleep improves sleep duration',
      intervention: 'Protect an 8h sleep opportunity',
      metric_type: 'sleep.duration',
      baseline_start: '2026-01-01',
      baseline_end: '2026-01-03',
      test_start: '2026-01-10',
      test_end: '2026-01-12',
      reversible: true
    };

    const created = await post(base, valid);
    t.eq('POST /experiments returns 201', created.status, 201);
    t.eq('created row defaults to planned with parsed null result',
      { status: created.json.experiment?.status, result: created.json.experiment?.result, reversible: created.json.experiment?.reversible },
      { status: 'planned', result: null, reversible: 1 });

    const id = created.json.experiment.id;
    const active = await patch(base, id, { status: 'active' });
    t.eq('PATCH status=active returns 200', active.status, 200);
    t.eq('PATCH active updates status only', active.json.experiment.status, 'active');

    const concluded = await patch(base, id, { status: 'concluded' });
    t.eq('PATCH status=concluded returns 200', concluded.status, 200);
    const result = concluded.json.result;
    t.eq('conclusion computes known means/delta',
      {
        status: result.status,
        baseline: result.baseline,
        test: result.test,
        delta: result.delta,
        direction: result.direction
      },
      {
        status: 'sufficient',
        baseline: { from: '2026-01-01', to: '2026-01-03', n: 3, mean: 8 },
        test: { from: '2026-01-10', to: '2026-01-12', n: 3, mean: 9 },
        delta: 1,
        direction: 'up'
      });
    t.ok('conclusion returns confidence context',
      ['low', 'medium', 'high'].includes(result.confidence) && typeof result.verdict === 'string');

    const listed = await fetch(`${base}/experiments`).then(r => r.json());
    const stored = listed.experiments.find(x => x.id === id);
    t.eq('GET /experiments returns stored parsed result',
      { status: stored.status, resultStatus: stored.result.status, delta: stored.result.delta },
      { status: 'concluded', resultStatus: 'sufficient', delta: 1 });

    const rerun = await fetch(`${base}/experiments/${id}/analysis`).then(r => r.json());
    t.eq('GET /experiments/:id/analysis recomputes deterministically', rerun.result.delta, 1);

    const insufficient = await post(base, {
      hypothesis: 'Short HRV trial',
      intervention: 'Try a breathing drill',
      metric_type: 'heart.hrv_sdnn',
      baseline_start: '2026-02-01',
      baseline_end: '2026-02-02',
      test_start: '2026-02-10',
      test_end: '2026-02-12'
    });
    const insufficientResult = await fetch(`${base}/experiments/${insufficient.json.experiment.id}/analysis`).then(r => r.json());
    t.eq('insufficient data yields explicit verdict',
      {
        status: insufficientResult.result.status,
        confidence: insufficientResult.result.confidence,
        baselineN: insufficientResult.result.baseline.n,
        testN: insufficientResult.result.test.n,
        delta: insufficientResult.result.delta
      },
      { status: 'insufficient', confidence: 'insufficient', baselineN: 2, testN: 3, delta: null });

    t.eq('unknown metric -> 400', (await post(base, { ...valid, metric_type: 'bogus.metric' })).status, 400);
    t.eq('invalid date shape -> 400', (await post(base, { ...valid, baseline_start: '01-01-2026' })).status, 400);
    t.eq('inverted date window -> 400', (await post(base, { ...valid, baseline_start: '2026-01-04' })).status, 400);
    t.eq('unknown status -> 400', (await patch(base, id, { status: 'running' })).status, 400);
    t.eq('empty patch body -> 400', (await patch(base, id, {})).status, 400);
    t.eq('missing experiment id -> 404', (await patch(base, 9999, { status: 'active' })).status, 404);
    t.eq('GET missing analysis id -> 404', (await fetch(`${base}/experiments/9999/analysis`)).status, 404);

    const obsAfter = await import('node:module').then(async ({ createRequire }) => {
      const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
      const Database = require('better-sqlite3');
      const d = new Database(path);
      try { return d.prepare('SELECT COUNT(*) AS n FROM observations').get().n; }
      finally { d.close(); }
    });
    t.eq('analysis never mutates observations', obsAfter, obsBefore);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().then(failed => process.exit(failed ? 1 : 0));
}
