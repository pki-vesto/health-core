// Deterministic fixture unit tests for api/lib/intelligence.js scoring.
// Every window is pinned with an explicit `to` so results never depend on the
// run date. Expected values are hand-computed against the scoring math and the
// round2/round4 the code applies (so exact JSON comparison is valid).
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, insertObs, seedDaily, harness } from './fixtures.mjs';
import {
  platformStatus, dashboard, recoverySummary, nutritionSummary, trainingSummary,
  correlations, predictions, experimentReadiness
} from '../lib/intelligence.js';

const TO = '2026-03-01';

export function run() {
  const t = harness('intelligence.js scoring (fixtures)');

  // ── platformStatus: goal registry + operational flag ───────────────────────
  {
    const db = buildDb();
    let s = platformStatus(db);
    t.eq('platformStatus empty → status empty', s.status, 'empty');
    insertObs(db, { metric: 'body.weight', date: TO, value: 80 });
    s = platformStatus(db);
    t.eq('platformStatus operational once data exists', s.status, 'operational');
    t.eq('platformStatus goals complete = 250', s.goals.completed, 250);
    t.eq('platformStatus goals total = 250', s.goals.total, 250);
    t.eq('platformStatus goals scope', s.goals.scope, '1-250');
    t.ok('platformStatus exposes invariants', Array.isArray(s.invariants) && s.invariants.includes('observations-kernel'));
    closeDb(db);
  }

  // ── recoverySummary.recovery_score ─────────────────────────────────────────
  // sleep [7,8,9] avg 8 → 8/8*100 = 100
  // hrv  [40,60,50] latest 50, #(≤50)=2 → 66.67
  // rhr  [60,50,55] latest 55, #(≤55)=2 → 66.67 → inverse 33.33
  // recovery = round2(mean(100,66.67,33.33)) = round2(200/3) = 66.67
  {
    const db = buildDb();
    seedDaily(db, 'sleep.duration', '2026-02-20', [7, 8, 9]);
    seedDaily(db, 'heart.hrv_sdnn', '2026-02-20', [40, 60, 50]);
    seedDaily(db, 'heart.resting_rate', '2026-02-20', [60, 50, 55]);
    const r = recoverySummary(db, { to: TO, days: 30 });
    t.eq('recovery domain', r.domain, 'recovery');
    t.eq('recovery range.from', r.range.from, '2026-01-31');
    t.eq('recovery range.to', r.range.to, TO);
    t.eq('recovery_score = 66.67', r.recovery_score, 66.67);
    closeDb(db);
  }

  // ── dashboard.summary + cards + alerts ─────────────────────────────────────
  // training_load = round2(avg/max*100) = 2000/3000*100 = 66.67
  // nutrition_consistency = mean of CV-inverse, all constant → 100
  // recovery as above = 66.67
  {
    const db = buildDb();
    seedDaily(db, 'fitness.session_volume', '2026-02-20', [1000, 2000, 3000]);
    seedDaily(db, 'nutrition.calories', '2026-02-20', [2000, 2000, 2000]);
    seedDaily(db, 'nutrition.protein', '2026-02-20', [150, 150, 150]);
    seedDaily(db, 'nutrition.carbs', '2026-02-20', [200, 200, 200]);
    seedDaily(db, 'nutrition.fat', '2026-02-20', [60, 60, 60]);
    seedDaily(db, 'sleep.duration', '2026-02-20', [7, 8, 9]);
    seedDaily(db, 'heart.hrv_sdnn', '2026-02-20', [40, 60, 50]);
    seedDaily(db, 'heart.resting_rate', '2026-02-20', [60, 50, 55]);
    seedDaily(db, 'body.weight', '2026-02-20', [80, 82, 81]);
    const d = dashboard(db, { to: TO, days: 30 });
    t.eq('dashboard.summary', d.summary, { training_load: 66.67, nutrition_consistency: 100, recovery: 66.67 });
    t.eq('dashboard alerts empty (n<7)', d.alerts, []);
    const w = d.cards.find(c => c.metric === 'body.weight');
    t.eq('body.weight trend', w.trend, { n: 3, avg: 81, min: 80, max: 82, delta: 1, direction: 'up' });
    t.eq('body.weight latest value', w.latest.value, 81);
    closeDb(db);
  }

  // ── anomalyAlerts fires at |z|>=2 once there are >=7 points ─────────────────
  // A single outlier among N equal values has z = sqrt(N-1) exactly (population
  // sd, magnitude-independent). 8 points → z=2.65 → medium; 10 points → z=3 → high.
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-15', [80, 80, 80, 80, 80, 80, 80, 120]); // 8 → medium
    const d = dashboard(db, { to: TO, days: 30 });
    const a = d.alerts.find(x => x.metric === 'body.weight');
    t.eq('anomaly medium (8 pts, z=sqrt7)', a && { z: a.z, severity: a.severity }, { z: 2.65, severity: 'medium' });
    closeDb(db);
  }
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-15', [80, 80, 80, 80, 80, 80, 80, 80, 80, 120]); // 10 → high
    const d = dashboard(db, { to: TO, days: 30 });
    const a = d.alerts.find(x => x.metric === 'body.weight');
    t.eq('anomaly high (10 pts, z=3)', a && { z: a.z, severity: a.severity }, { z: 3, severity: 'high' });
    closeDb(db);
  }

  // ── nutritionSummary.macro_balance (energy %) ──────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'nutrition.calories', '2026-02-20', [2000, 2000, 2000]);
    seedDaily(db, 'nutrition.protein', '2026-02-20', [150, 150, 150]);
    seedDaily(db, 'nutrition.carbs', '2026-02-20', [200, 200, 200]);
    seedDaily(db, 'nutrition.fat', '2026-02-20', [60, 60, 60]);
    const n = nutritionSummary(db, { to: TO, days: 30 });
    t.eq('macro_balance', n.macro_balance, {
      calories_avg: 2000, protein_g_avg: 150, carbs_g_avg: 200, fat_g_avg: 60,
      protein_pct_energy: 30, carbs_pct_energy: 40, fat_pct_energy: 27
    });
    closeDb(db);
  }

  // ── trainingSummary trend shape ────────────────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'fitness.session_volume', '2026-02-20', [1000, 2000, 3000]);
    const s = trainingSummary(db, { to: TO, days: 30 });
    t.eq('training domain', s.domain, 'training');
    const vol = s.metrics.find(m => m.metric === 'fitness.session_volume');
    t.eq('session_volume trend', vol.trend, { n: 3, avg: 2000, min: 1000, max: 3000, delta: 2000, direction: 'up' });
    closeDb(db);
  }

  // ── correlations: perfect positive linear → r = 1 ──────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-20', [80, 81, 82]);
    seedDaily(db, 'nutrition.calories', '2026-02-20', [2000, 2025, 2050]); // = 25 * weight
    const c = correlations(db, { to: TO, days: 90 });
    t.eq('one correlation pair found', c.correlations.length, 1);
    t.eq('perfect positive correlation', c.correlations[0], { a: 'body.weight', b: 'nutrition.calories', n: 3, r: 1 });
    closeDb(db);
  }

  // ── predictions: linear slope forecast ─────────────────────────────────────
  // y = 80 + x, x=0..4; horizon 14 → next = 80 + (4+14) = 98
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-25', [80, 81, 82, 83, 84]);
    const p = predictions(db, { to: TO, days: 90, horizon: 14 });
    t.eq('one prediction (only metric with n>=3)', p.predictions.length, 1);
    t.eq('linear forecast', p.predictions[0], { metric: 'body.weight', n: 5, slope_per_day: 1, next: 98, confidence: 'low' });
    closeDb(db);
  }

  // ── experimentReadiness: ready when n>=14 ──────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-01', Array(14).fill(80));
    seedDaily(db, 'heart.resting_rate', '2026-02-20', [55, 56]);
    const e = experimentReadiness(db);
    t.eq('no experiments yet', e.experiments, []);
    const bw = e.candidate_metrics.find(m => m.key === 'body.weight');
    const rhr = e.candidate_metrics.find(m => m.key === 'heart.resting_rate');
    t.eq('body.weight ready (n=14)', { n: bw.n, ready: bw.ready }, { n: 14, ready: true });
    t.eq('resting_rate not ready (n=2)', { n: rhr.n, ready: rhr.ready }, { n: 2, ready: false });
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
