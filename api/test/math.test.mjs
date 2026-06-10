// Quality tests for the correlation (Pearson) and prediction (least-squares
// linear regression) math, with hand-computed expected outputs. Exercised
// through the public correlations()/predictions() functions.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, seedDaily, insertObs, harness } from './fixtures.mjs';
import { correlations, predictions } from '../lib/intelligence.js';

const TO = '2026-03-01';

// Helper: correlate body.weight (x) vs nutrition.calories (y) over consecutive
// days and return the single resulting r (or undefined).
function pairR(db, xs, ys) {
  seedDaily(db, 'body.weight', '2026-02-20', xs);
  seedDaily(db, 'nutrition.calories', '2026-02-20', ys);
  const c = correlations(db, { to: TO, days: 90, metrics: 'body.weight,nutrition.calories' });
  return c.correlations[0];
}

export function run() {
  const t = harness('correlation + prediction math');

  // ── Pearson: perfect positive ──────────────────────────────────────────────
  { const db = buildDb(); t.eq('r = +1 (perfectly linear up)', pairR(db, [80, 81, 82], [2000, 2025, 2050])?.r, 1); closeDb(db); }

  // ── Pearson: perfect negative ──────────────────────────────────────────────
  { const db = buildDb(); t.eq('r = -1 (perfectly linear down)', pairR(db, [80, 81, 82], [3000, 2000, 1000])?.r, -1); closeDb(db); }

  // ── Pearson: zero (symmetric, no linear trend) ─────────────────────────────
  { const db = buildDb(); t.eq('r = 0 (symmetric)', pairR(db, [80, 81, 82, 83], [2000, 1000, 1000, 2000])?.r, 0); closeDb(db); }

  // ── Pearson: known partial value ───────────────────────────────────────────
  // x=[1..5], y=[2,4,5,4,5] → r = 6/sqrt(60) = 0.7746 (round4)
  { const db = buildDb(); t.eq('r = 0.7746 (known dataset)', pairR(db, [1, 2, 3, 4, 5], [2, 4, 5, 4, 5])?.r, 0.7746); closeDb(db); }

  // ── Pearson: requires >= 3 shared pairs ────────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-20', [80, 81]);
    seedDaily(db, 'nutrition.calories', '2026-02-20', [2000, 2100]);
    const c = correlations(db, { to: TO, days: 90, metrics: 'body.weight,nutrition.calories' });
    t.eq('no correlation with only 2 pairs', c.correlations, []);
    closeDb(db);
  }

  // ── Regression: rising slope = +1, forecast = intercept + slope*(lastX+h) ───
  // y=80+x, x=0..4, horizon 14 → next = 80 + 18 = 98
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-25', [80, 81, 82, 83, 84]);
    const p = predictions(db, { to: TO, days: 90, horizon: 14, metrics: 'body.weight' }).predictions[0];
    t.eq('rising forecast', { slope: p.slope_per_day, next: p.next, conf: p.confidence }, { slope: 1, next: 98, conf: 'low' });
    closeDb(db);
  }

  // ── Regression: flat slope = 0 ─────────────────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-25', [80, 80, 80]);
    const p = predictions(db, { to: TO, days: 90, horizon: 7, metrics: 'body.weight' }).predictions[0];
    t.eq('flat forecast', { slope: p.slope_per_day, next: p.next }, { slope: 0, next: 80 });
    closeDb(db);
  }

  // ── Regression: falling slope = -2 ─────────────────────────────────────────
  // y=84-2x, x=0..2, horizon 14 → next = 84 - 2*(2+14) = 52
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-27', [84, 82, 80]);
    const p = predictions(db, { to: TO, days: 90, horizon: 14, metrics: 'body.weight' }).predictions[0];
    t.eq('falling forecast', { slope: p.slope_per_day, next: p.next }, { slope: -2, next: 52 });
    closeDb(db);
  }

  // ── Regression: confidence upgrades to medium at n>=30 ──────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-01-15', Array.from({ length: 30 }, (_, i) => 80 + i * 0.1));
    const p = predictions(db, { to: TO, days: 90, horizon: 7, metrics: 'body.weight' }).predictions[0];
    t.eq('confidence medium at n=30', { n: p.n, conf: p.confidence }, { n: 30, conf: 'medium' });
    closeDb(db);
  }

  // ── Regression: omitted when n < 3 ─────────────────────────────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'body.weight', date: '2026-02-28', value: 80 });
    insertObs(db, { metric: 'body.weight', date: '2026-03-01', value: 81 });
    const p = predictions(db, { to: TO, days: 90, horizon: 7, metrics: 'body.weight' });
    t.eq('no prediction with n<3', p.predictions, []);
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
