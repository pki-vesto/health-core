// Deterministic fixture unit tests for api/lib/platform.js — mood, body
// composition, sleep, nutrition, recovery (fatigue), training, baselines, risk
// and insight logic. Windows pinned via `to`.
//
// Fatigue uses HRV + sleep + a local resting-heart-rate baseline. RHR is scoped
// to fatigue scoring so the public /baselines metric set stays stable.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, insertObs, seedDaily, harness } from './fixtures.mjs';
import {
  moodDashboard, bodyCompositionDashboard, sleepAdvanced, nutritionIntelligence,
  recoveryIntelligence, trainingIntelligence, baselines, risks, insights
} from '../lib/platform.js';

const TO = '2026-03-01';

export function run() {
  const t = harness('platform.js (fixtures)');

  // ── moodDashboard: averageLatest + patterns ────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'mood.valence', '2026-02-24', [50, 60]); // latest 60, delta +10 up
    insertObs(db, { metric: 'mood.energy', date: '2026-02-25', value: 70 });
    insertObs(db, { metric: 'mood.motivation', date: '2026-02-25', value: 50 });
    const m = moodDashboard(db, { to: TO, days: 90 });
    t.eq('mood score = mean of latest', m.score, 60); // mean(60,70,50)
    const vp = m.patterns.find(p => p.metric === 'mood.valence');
    t.eq('mood valence pattern', vp, { metric: 'mood.valence', direction: 'up', delta: 10, confidence: 'low' });
    closeDb(db);
  }

  // ── bodyCompositionDashboard: recomposition detection ──────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.fat_percent', '2026-02-20', [20, 18]);   // delta -2
    seedDaily(db, 'body.muscle_mass', '2026-02-20', [35, 37]);   // delta +2
    const b = bodyCompositionDashboard(db, { to: TO, days: 365 });
    t.eq('positive recomposition', b.recomposition, { status: 'positive_recomposition', fat_delta: -2, muscle_delta: 2 });
    closeDb(db);
  }

  // ── sleepAdvanced: debt, quality, null jetlag/consistency without clock data ─
  {
    const db = buildDb();
    seedDaily(db, 'sleep.duration', '2026-02-20', [7, 8, 6]); // deficits 1,0,2 → total 3, 2 days below
    const s = sleepAdvanced(db, { to: TO, days: 90 });
    t.eq('sleep_debt', s.sleep_debt, { target_hours: 8, total_hours: 3, days_below_target: 2 });
    t.eq('sleep deficits', s.deficits, 2);
    t.eq('sleep quality_score', s.quality_score, 84.5); // (7/8*100) - 3
    t.eq('social_jetlag null (no wake data)', s.social_jetlag, null);
    t.eq('consistency null (no clock data)', s.consistency, null);
    closeDb(db);
  }

  // ── nutritionIntelligence: quality, deficiencies, excesses ─────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'nutrition.fiber', date: '2026-02-25', value: 30 });
    insertObs(db, { metric: 'nutrition.water', date: '2026-02-25', value: 3 });
    insertObs(db, { metric: 'nutrition.sodium', date: '2026-02-25', value: 2000 });
    insertObs(db, { metric: 'nutrition.micronutrient_index', date: '2026-02-25', value: 80 });
    const n = nutritionIntelligence(db, { to: TO, days: 90 });
    t.eq('nutrition quality (all good)', n.quality_score, 97); // 50+15+10+10+12
    t.eq('no deficiencies', n.deficiencies, []);
    t.eq('no excesses', n.excesses, []);
    closeDb(db);
  }
  {
    const db = buildDb();
    insertObs(db, { metric: 'nutrition.fiber', date: '2026-02-25', value: 10 });
    insertObs(db, { metric: 'nutrition.water', date: '2026-02-25', value: 1 });
    insertObs(db, { metric: 'nutrition.sodium', date: '2026-02-25', value: 3000 });
    insertObs(db, { metric: 'nutrition.micronutrient_index', date: '2026-02-25', value: 50 });
    const n = nutritionIntelligence(db, { to: TO, days: 90 });
    t.eq('nutrition quality (poor)', n.quality_score, 57.5); // 50 + 7.5
    t.eq('deficiencies detected', n.deficiencies, ['fiber', 'water', 'micronutrients']);
    t.eq('excess sodium detected', n.excesses, ['sodium']);
    closeDb(db);
  }

  // ── recoveryIntelligence: fatigue from HRV+sleep baseline deviation ─────────
  {
    const db = buildDb();
    seedDaily(db, 'heart.hrv_sdnn', '2026-02-15', [60, 60, 60, 40]);  // latest z ≈ -1.73
    seedDaily(db, 'sleep.duration', '2026-02-15', [8, 8, 8, 6]);       // latest z ≈ -1.73
    const r = recoveryIntelligence(db, { to: TO, days: 90 });
    t.eq('fatigue = 70 (hrv+sleep)', r.fatigue, 70);
    t.eq('capacity = 30', r.capacity, 30);
    t.eq('insufficient recovery', r.insufficient_recovery, true);
    t.eq('predicted recovery days', r.predicted_recovery_days, 3); // round(70/25)
    t.eq('medium fatigue warning', r.warnings, [{ type: 'accumulating_fatigue', severity: 'medium', score: 70 }]);
    closeDb(db);
  }
  // ── recovery/training: elevated RHR makes high fatigue paths reachable ──────
  {
    const db = buildDb();
    seedDaily(db, 'heart.hrv_sdnn', '2026-02-15', [60, 60, 60, 40]);      // low HRV → +25
    seedDaily(db, 'sleep.duration', '2026-02-15', [8, 8, 8, 6]);          // short sleep → +25
    seedDaily(db, 'heart.resting_rate', '2026-02-15', [58, 58, 58, 74]);  // elevated RHR → +20
    seedDaily(db, 'fitness.session_volume', '2026-02-15', [1200, 1300, 1400, 1500]);

    const r = recoveryIntelligence(db, { to: TO, days: 90 });
    t.eq('fatigue includes elevated resting HR', r.fatigue, 90);
    t.eq('high fatigue warning reachable', r.warnings, [{ type: 'accumulating_fatigue', severity: 'high', score: 90 }]);

    const tr = trainingIntelligence(db, { to: TO, days: 120 });
    t.eq('overtraining reachable with elevated RHR fatigue', tr.overtraining, true);
    t.eq('adaptation limited by recovery', tr.adaptation, 'limited_by_recovery');
    t.eq('recovery-first recommendation', tr.recommendations, ['Prioritize recovery before adding load.']);
    closeDb(db);
  }

  // ── trainingIntelligence: positive adaptation, no plateau/regression ───────
  {
    const db = buildDb();
    seedDaily(db, 'fitness.session_volume', '2026-02-20', [1000, 1500, 2000]); // rising
    const tr = trainingIntelligence(db, { to: TO, days: 120 });
    t.eq('adaptation positive', tr.adaptation, 'positive');
    t.eq('no overtraining without fatigue signals', tr.overtraining, false);
    t.eq('not underloaded', tr.underload, false);
    t.eq('no plateau', tr.plateaus, []);
    t.eq('no regression', tr.regression, []);
    t.eq('maintain recommendation', tr.recommendations, ['Maintain current load and monitor recovery response.']);
    t.eq('prediction targets volume', tr.prediction.metric, 'fitness.session_volume');
    closeDb(db);
  }
  // ── trainingIntelligence: plateau + underload ──────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'fitness.session_volume', '2026-02-20', [500, 500, 500]); // flat + low
    const tr = trainingIntelligence(db, { to: TO, days: 120 });
    t.eq('underloaded', tr.underload, true);
    t.eq('plateau detected', tr.plateaus.length, 1);
    t.eq('adaptation neutral', tr.adaptation, 'neutral');
    t.eq('increase recommendation', tr.recommendations, ['Increase weekly training stimulus gradually if recovery stays stable.']);
    closeDb(db);
  }

  // ── baselines: deviation + alert thresholds ────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-02-15', [80, 80, 80, 80, 90]); // z = sqrt(4) = 2 exactly
    seedDaily(db, 'heart.hrv_sdnn', '2026-02-15', [60, 60, 60, 40]);  // z ≈ -1.73
    const b = baselines(db, { to: TO, days: 365 });
    const wt = b.baselines.find(x => x.metric === 'body.weight');
    t.eq('weight baseline z = 2', wt.z, 2);
    t.eq('deviations (|z|>=1.5)', b.deviations.map(d => d.metric), ['heart.hrv_sdnn', 'body.weight']);
    t.eq('alerts (|z|>=2)', b.alerts, [{ metric: 'body.weight', z: 2, severity: 'medium' }]);
    closeDb(db);
  }

  // ── risks: deterioration + sudden change on a rising bad-direction metric ───
  {
    const db = buildDb();
    seedDaily(db, 'blood.glucose', '2026-02-20', [5.0, 5.5, 6.0], { source: 'lab' }); // rising = bad
    const r = risks(db, { to: TO, days: 365 });
    t.eq('two indicators', r.indicators.length, 2);
    t.eq('indicator types', r.indicators.map(i => i.type).sort(), ['deterioration', 'sudden_change']);
    t.eq('risk_score = 24', r.risk_score, 24); // 2 * 12
    t.eq('metabolic captures glucose', r.metabolic.length, 2);
    t.eq('cardiovascular empty', r.cardiovascular, []);
    closeDb(db);
  }

  // ── insights: wellbeing + biomarker, ranked by impact+confidence ───────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'mood.valence', date: '2026-02-25', value: 40 });
    insertObs(db, { metric: 'mood.energy', date: '2026-02-25', value: 40 });
    insertObs(db, { metric: 'mood.motivation', date: '2026-02-25', value: 40 }); // score 40 < 50
    insertObs(db, { metric: 'blood.crp', date: '2026-02-01', value: 5.0, source: 'lab' }); // abnormal high
    const out = insights(db, { to: TO }).insights;
    t.eq('two insights', out.length, 2);
    t.eq('wellbeing ranked first', { category: out[0].category, impact: out[0].impact, confidence: out[0].confidence, uncertainty: out[0].uncertainty },
      { category: 'wellbeing', impact: 60, confidence: 60, uncertainty: 'medium' });
    t.eq('biomarker ranked second', { category: out[1].category, impact: out[1].impact, confidence: out[1].confidence, uncertainty: out[1].uncertainty },
      { category: 'biomarker', impact: 55, confidence: 55, uncertainty: 'medium' });
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
