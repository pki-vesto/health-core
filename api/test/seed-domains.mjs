// Reusable fixture seeder covering all domains (1-25), for tests and the demo
// server (task #14). Deterministic — values are smooth functions of the day
// index (no randomness), so any test built on this data is reproducible.
//
//   import { buildDb } from './fixtures.mjs';
//   import { seedAllDomains } from './seed-domains.mjs';
//   const db = seedAllDomains(buildDb(), { to: '2026-03-01', days: 60 });
import { insertObs, addDays } from './fixtures.mjs';

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

  return db;
}

export default seedAllDomains;
