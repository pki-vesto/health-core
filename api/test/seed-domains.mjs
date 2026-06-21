// Reusable fixture seeder covering all domains (1-25), for tests and the demo
// server (task #14). Deterministic — values are smooth functions of the day
// index (no randomness), so any test built on this data is reproducible.
//
//   import { buildDb } from './fixtures.mjs';
//   import { seedAllDomains } from './seed-domains.mjs';
//   const db = seedAllDomains(buildDb(), { to: '2026-03-01', days: 60 });
import { insertObs, addDays } from './fixtures.mjs';

export const DOMAIN_FIXTURE_COVERAGE = [
  { domain: 1, title: 'Platform foundation', metrics: ['body.weight'], tables: ['sources', 'metric_types'] },
  { domain: 2, title: 'Apple Health integration', metrics: ['heart.resting_rate', 'heart.hrv_sdnn', 'fitness.vo2max', 'sleep.duration', 'activity.steps'] },
  { domain: 3, title: 'Dashboard foundation', metrics: ['body.weight', 'fitness.session_volume', 'nutrition.calories', 'sleep.duration'] },
  { domain: 4, title: 'Training analytics', metrics: ['fitness.session_volume', 'score.training_load'] },
  { domain: 5, title: 'Nutrition analytics', metrics: ['nutrition.calories', 'nutrition.protein', 'nutrition.carbs', 'nutrition.fat', 'score.nutrition_consistency'] },
  { domain: 6, title: 'Recovery analytics', metrics: ['heart.hrv_sdnn', 'sleep.duration', 'score.recovery'] },
  { domain: 7, title: 'Correlation engine', metrics: ['body.weight', 'nutrition.calories', 'fitness.session_volume'] },
  { domain: 8, title: 'Experiment framework', metrics: ['body.weight'], tables: ['experiments'] },
  { domain: 9, title: 'Predictive intelligence', metrics: ['body.weight', 'fitness.vo2max', 'score.training_response'] },
  { domain: 10, title: 'Product maturity', metrics: ['score.health_operating_system'], tables: ['ingest_log', 'quarantine'] },
  { domain: 11, title: 'Biomarkers', metrics: ['blood.apob', 'blood.glucose', 'blood.crp'] },
  { domain: 12, title: 'Bloodwork', metrics: ['blood.total_cholesterol', 'blood.ldl_cholesterol', 'blood.hdl_cholesterol', 'blood.triglycerides'] },
  { domain: 13, title: 'Stress intelligence', metrics: ['stress.perceived', 'score.stress', 'score.cardiometabolic'] },
  { domain: 14, title: 'Mood and wellbeing', metrics: ['mood.valence', 'mood.energy', 'mood.motivation', 'score.mood'] },
  { domain: 15, title: 'Symptoms', metrics: ['symptom.severity', 'score.symptom_burden'] },
  { domain: 16, title: 'Body composition', metrics: ['body.fat_percent', 'body.muscle_mass', 'body.lean_mass', 'body.visceral_fat', 'body.water_percent'] },
  { domain: 17, title: 'Sleep 2.0', metrics: ['sleep.deep', 'sleep.rem', 'sleep.light', 'sleep.awake', 'sleep.bedtime', 'sleep.wake_time', 'score.sleep_quality'] },
  { domain: 18, title: 'Nutrition 2.0', metrics: ['nutrition.fiber', 'nutrition.sodium', 'nutrition.water', 'nutrition.micronutrient_index', 'nutrition.meal_timing_score', 'score.nutrition_quality'] },
  { domain: 19, title: 'Recovery 2.0', metrics: ['score.recovery', 'score.fatigue', 'baseline.recovery'] },
  { domain: 20, title: 'Training 2.0', metrics: ['score.training_response', 'baseline.training'] },
  { domain: 21, title: 'Longitudinal intelligence', metrics: ['body.weight'], tables: ['health_milestones'] },
  { domain: 22, title: 'Personal baselines', metrics: ['baseline.hrv', 'baseline.sleep', 'baseline.weight', 'baseline.recovery', 'baseline.training'] },
  { domain: 23, title: 'Risk detection', metrics: ['score.risk', 'blood.glucose', 'blood.hba1c', 'score.stress'] },
  { domain: 24, title: 'Insights engine', metrics: ['score.risk', 'score.recovery'], tables: ['insight_events'] },
  { domain: 25, title: 'Health OS briefings', metrics: ['score.health_operating_system'], tables: ['briefing_snapshots', 'user_health_goals'] }
];

// Generate `days` daily values v(i) = base + trend*i + amp*sin(i/period),
// clamped to >=min, rounded. Smooth + deterministic.
function curve({ base, amp = 0, trend = 0, period = 7, days, min = null, round = 2 }) {
  const out = [];
  for (let i = 0; i < days; i++) {
    let v = base + trend * i + amp * Math.sin(i / period);
    if (min != null) v = Math.max(min, v);
    const f = 10 ** round;
    out.push(Math.round(v * f) / f);
  }
  return out;
}

// Seed a daily series ending at `to`.
function series(db, metric, to, spec, opts = {}) {
  const vals = curve({ ...spec, days: spec.days });
  const start = addDays(to, -(spec.days - 1));
  let d = start;
  for (const v of vals) { insertObs(db, { metric, date: d, value: v, ...opts }); d = addDays(d, 1); }
}

export function seedAllDomains(db, { to = null, days = 60 } = {}) {
  const T = to || db.prepare("SELECT date('now') AS d").get().d;

  // Domains 1-10 — base signals (manual/shred/apple sources).
  series(db, 'body.weight', T, { base: 82, amp: 0.6, trend: -0.02, days });
  series(db, 'fitness.session_volume', T, { base: 4000, amp: 1500, trend: 8, days, min: 0, round: 0 }, { source: 'shred' });
  series(db, 'nutrition.calories', T, { base: 2400, amp: 200, days, round: 0 }, { source: 'shred' });
  series(db, 'nutrition.protein', T, { base: 160, amp: 15, days, round: 0 }, { source: 'shred' });
  series(db, 'nutrition.carbs', T, { base: 240, amp: 30, days, round: 0 }, { source: 'shred' });
  series(db, 'nutrition.fat', T, { base: 75, amp: 10, days, round: 0 }, { source: 'shred' });
  series(db, 'heart.resting_rate', T, { base: 56, amp: 3, days }, { source: 'apple_health' });
  series(db, 'heart.hrv_sdnn', T, { base: 65, amp: 12, days }, { source: 'apple_health' });
  series(db, 'fitness.vo2max', T, { base: 48, amp: 1, trend: 0.01, days }, { source: 'apple_health' });
  series(db, 'sleep.duration', T, { base: 7.3, amp: 0.8, days }, { source: 'apple_health' });
  series(db, 'activity.steps', T, { base: 9000, amp: 2500, days, min: 0, round: 0 }, { source: 'apple_health' });

  // Domains 11-12 — biomarkers (sparse, monthly, from lab).
  const labDates = [addDays(T, -days + 5), addDays(T, -Math.floor(days / 2)), addDays(T, -2)];
  const labVals = {
    'blood.total_cholesterol': [4.8, 4.6, 4.4], 'blood.ldl_cholesterol': [2.9, 2.7, 2.5],
    'blood.hdl_cholesterol': [1.3, 1.35, 1.4], 'blood.triglycerides': [1.4, 1.2, 1.1],
    'blood.apob': [0.9, 0.85, 0.78], 'blood.glucose': [5.3, 5.1, 5.0], 'blood.hba1c': [5.4, 5.3, 5.2],
    'blood.crp': [1.8, 1.2, 0.9], 'blood.vitamin_d': [62, 70, 82], 'blood.ferritin': [120, 130, 140],
    'hormone.testosterone': [18, 19, 20], 'hormone.cortisol': [420, 400, 380]
  };
  for (const [metric, vals] of Object.entries(labVals)) {
    vals.forEach((v, i) => insertObs(db, { metric, date: labDates[i], value: v, source: 'lab' }));
  }

  // Domain 13 — stress.
  series(db, 'stress.perceived', T, { base: 45, amp: 20, days });

  // Domain 14 — mood / wellbeing.
  series(db, 'mood.valence', T, { base: 62, amp: 15, days });
  series(db, 'mood.energy', T, { base: 60, amp: 18, days });
  series(db, 'mood.motivation', T, { base: 58, amp: 16, days });

  // Domain 15 — symptoms (with category metadata).
  series(db, 'symptom.severity', T, { base: 30, amp: 20, days }, { metadata: { symptom: 'headache', category: 'pain' } });

  // Domain 16 — body composition.
  series(db, 'body.fat_percent', T, { base: 18, amp: 0.5, trend: -0.01, days });
  series(db, 'body.muscle_mass', T, { base: 36, amp: 0.3, trend: 0.01, days });
  series(db, 'body.lean_mass', T, { base: 65, amp: 0.4, days });
  series(db, 'body.visceral_fat', T, { base: 8, amp: 0.3, days });
  series(db, 'body.water_percent', T, { base: 55, amp: 1, days });

  // Domain 17 — sleep stages + clock.
  series(db, 'sleep.deep', T, { base: 1.4, amp: 0.3, days });
  series(db, 'sleep.rem', T, { base: 1.6, amp: 0.3, days });
  series(db, 'sleep.light', T, { base: 3.8, amp: 0.5, days });
  series(db, 'sleep.awake', T, { base: 0.4, amp: 0.2, days, min: 0 });
  series(db, 'sleep.bedtime', T, { base: 23.2, amp: 0.6, days });
  series(db, 'sleep.wake_time', T, { base: 6.9, amp: 0.7, days });

  // Domain 18 — nutrition 2.0.
  series(db, 'nutrition.fiber', T, { base: 28, amp: 6, days });
  series(db, 'nutrition.sodium', T, { base: 2100, amp: 400, days, round: 0 });
  series(db, 'nutrition.water', T, { base: 2.4, amp: 0.5, days });
  series(db, 'nutrition.micronutrient_index', T, { base: 75, amp: 10, days });
  series(db, 'nutrition.meal_timing_score', T, { base: 70, amp: 12, days });

  // Domains 19-20 — recovery/training derived scores.
  series(db, 'score.recovery', T, { base: 68, amp: 14, days });
  series(db, 'score.fatigue', T, { base: 35, amp: 18, days, min: 0 });
  series(db, 'score.training_response', T, { base: 60, amp: 15, days });
  series(db, 'score.stress', T, { base: 50, amp: 18, days });

  // Cross-domain score/baseline metrics that are active vocabulary but were not
  // tied to a single raw ingest stream. They keep fixture audits complete while
  // remaining deterministic and visibly derived via the health_core source.
  series(db, 'score.training_load', T, { base: 62, amp: 12, days }, { source: 'health_core' });
  series(db, 'score.nutrition_consistency', T, { base: 74, amp: 9, days }, { source: 'health_core' });
  series(db, 'score.health_operating_system', T, { base: 82, amp: 4, trend: 0.03, days }, { source: 'health_core' });
  series(db, 'score.cardiometabolic', T, { base: 78, amp: 6, days }, { source: 'health_core' });
  series(db, 'score.mood', T, { base: 64, amp: 14, days }, { source: 'health_core' });
  series(db, 'score.symptom_burden', T, { base: 26, amp: 12, days, min: 0 }, { source: 'health_core' });
  series(db, 'score.sleep_quality', T, { base: 71, amp: 11, days }, { source: 'health_core' });
  series(db, 'score.nutrition_quality', T, { base: 76, amp: 8, days }, { source: 'health_core' });
  series(db, 'score.risk', T, { base: 22, amp: 16, days, min: 0 }, { source: 'health_core' });
  series(db, 'baseline.hrv', T, { base: 63, amp: 2, days }, { source: 'health_core' });
  series(db, 'baseline.sleep', T, { base: 7.4, amp: 0.15, days }, { source: 'health_core' });
  series(db, 'baseline.weight', T, { base: 82, amp: 0.2, trend: -0.01, days }, { source: 'health_core' });
  series(db, 'baseline.recovery', T, { base: 69, amp: 4, days }, { source: 'health_core' });
  series(db, 'baseline.training', T, { base: 61, amp: 5, days }, { source: 'health_core' });

  // Domain 21 — long-range context and milestones. Add an older point so
  // longitudinal windows have a prior year to compare, plus milestone rows.
  insertObs(db, { metric: 'body.weight', date: addDays(T, -365), value: 86.4, source: 'manual', externalId: 'fixture:longitudinal:body.weight' });

  seedTableFixtures(db, T);

  return db;
}

export default seedAllDomains;

function seedTableFixtures(db, T) {
  db.prepare(`
    INSERT INTO experiments
      (hypothesis, intervention, reversible, design, metric_type, baseline_start, baseline_end, test_start, test_end, status, result)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Earlier caffeine improves HRV baseline',
    'No caffeine after 12:00',
    1,
    'single',
    'heart.hrv_sdnn',
    addDays(T, -56),
    addDays(T, -43),
    addDays(T, -42),
    addDays(T, -29),
    'concluded',
    JSON.stringify({ outcome: 'positive', delta: 4.2 })
  );

  db.prepare(`
    INSERT INTO ingest_log
      (received_at, source, format, status, records_in, records_written, records_quarantined, payload_sha256, payload, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`${T}T08:00:00Z`, 'apple_health', 'apple_health', 'partial', 5, 4, 1, 'f'.repeat(64), '{"fixture":true}', 'one incomplete fixture record');
  const ingestId = Number(db.prepare('SELECT last_insert_rowid() AS id').get().id);
  db.prepare(`
    INSERT INTO quarantine (ingest_id, source, raw_record, reason, resolved)
    VALUES (?, ?, ?, ?, ?)
  `).run(ingestId, 'apple_health', '{"metric":"activity.steps","timestamp":null,"value":9000}', 'missing timestamp', 0);

  db.prepare(`
    INSERT INTO derived_metrics (metric_type, timestamp, value, unit, formula_version, inputs)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('score.recovery', T, 72, 'score', 'fixture_recovery_score_v1', JSON.stringify(['heart.hrv_sdnn', 'sleep.duration', 'heart.resting_rate']));

  const milestoneRows = [
    [addDays(T, -45), 'record_low', 'Lowest fixture bodyweight', 'Representative longitudinal bodyweight milestone.', 'body.weight', 81.2],
    [addDays(T, -12), 'logging_streak', '7-day sleep fixture streak', 'Representative adherence milestone.', 'sleep.duration', 7]
  ];
  const insMilestone = db.prepare(`
    INSERT INTO health_milestones (timestamp, category, title, detail, metric_type, value)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const row of milestoneRows) insMilestone.run(...row);

  const insightRows = [
    ['risk', 'Glucose trend requires attention', 'Fixture risk signal from rising glucose.', 80, 72, { metric: 'blood.glucose' }, { window: '60d' }, 'medium'],
    ['recovery', 'Recovery capacity is improving', 'Fixture recovery signal from HRV and sleep.', 65, 76, { metric: 'score.recovery' }, { window: '60d' }, 'low']
  ];
  const insInsight = db.prepare(`
    INSERT INTO insight_events (category, title, summary, impact, confidence, evidence, source_data, uncertainty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of insightRows) {
    insInsight.run(row[0], row[1], row[2], row[3], row[4], JSON.stringify(row[5]), JSON.stringify(row[6]), row[7]);
  }

  const insBriefing = db.prepare(`
    INSERT INTO briefing_snapshots (period, generated_at, payload, payload_sha256, summary)
    VALUES (?, ?, ?, ?, ?)
  `);
  const dailyPayload = JSON.stringify({ period: 'daily', generated_at: `${T}T07:00:00+01:00`, summary: { fixture: true } });
  const weeklyPayload = JSON.stringify({ period: 'weekly', generated_at: `${T}T07:05:00+01:00`, summary: { fixture: true, weekly: true } });
  insBriefing.run('daily', `${T}T07:00:00+01:00`, dailyPayload, 'a'.repeat(64), '{"fixture":true}');
  insBriefing.run('weekly', `${T}T07:05:00+01:00`, weeklyPayload, 'b'.repeat(64), '{"fixture":true,"weekly":true}');

  const insGoal = db.prepare(`
    INSERT INTO user_health_goals
      (metric_key, comparator, target_value, target_low, target_high, window, deadline, status, label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insGoal.run('body.weight', 'lte', 80, null, null, '90d', addDays(T, 60), 'active', 'Cut target');
  insGoal.run('heart.hrv_sdnn', 'gte', 60, null, null, '30d', null, 'paused', 'Recovery floor');
}
