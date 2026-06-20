import { correlations, predictions } from './intelligence.js';
import { brief, decisionSupport, healthProfile } from './health-os.js';
import {
  rangeParams, metricTrends, observations, values, latestMap, averageLatest,
  patterns, baseline, compareWindows, seasonal, recurringCycles, consistency,
  metricExists, dateAdd, trendMap, groupBy, json, mean, round, roundStats
} from './series.js';

const MOOD = ['mood.valence', 'mood.energy', 'mood.motivation'];
const SYMPTOMS = ['symptom.severity'];
const COMPOSITION = ['body.weight', 'body.fat_percent', 'body.muscle_mass', 'body.lean_mass', 'body.visceral_fat', 'body.water_percent'];
const SLEEP = ['sleep.duration', 'sleep.deep', 'sleep.rem', 'sleep.light', 'sleep.awake', 'sleep.bedtime', 'sleep.wake_time'];
const NUTRITION2 = ['nutrition.calories', 'nutrition.protein', 'nutrition.carbs', 'nutrition.fat', 'nutrition.fiber', 'nutrition.sodium', 'nutrition.water', 'nutrition.micronutrient_index', 'nutrition.meal_timing_score'];
const RECOVERY2 = ['heart.hrv_sdnn', 'heart.resting_rate', 'sleep.duration', 'score.recovery', 'score.fatigue'];
const TRAINING2 = ['fitness.session_volume', 'activity.steps', 'fitness.vo2max', 'score.training_response'];
const BASELINE_METRICS = ['heart.hrv_sdnn', 'sleep.duration', 'body.weight', 'score.recovery', 'fitness.session_volume'];
const RISK_METRICS = ['heart.resting_rate', 'heart.hrv_sdnn', 'sleep.duration', 'body.weight', 'blood.apob', 'blood.glucose', 'blood.hba1c', 'blood.crp', 'score.stress'];

export function trackingSchema(db) {
  const metricRows = db.prepare(`
    SELECT key, display_name, unit, description FROM metric_types
     WHERE key IN (${[...MOOD, ...SYMPTOMS, ...COMPOSITION, ...SLEEP, ...NUTRITION2, 'stress.perceived'].map(() => '?').join(',')})
     ORDER BY key
  `).all(...[...MOOD, ...SYMPTOMS, ...COMPOSITION, ...SLEEP, ...NUTRITION2, 'stress.perceived']);
  return {
    source: 'manual',
    forms: [
      { id: 'mood', title: 'Mood check-in', metrics: MOOD },
      { id: 'symptom', title: 'Symptom log', metrics: SYMPTOMS, metadata: ['symptom', 'category'] },
      { id: 'composition', title: 'Body composition', metrics: COMPOSITION },
      { id: 'sleep', title: 'Sleep detail', metrics: SLEEP },
      { id: 'nutrition', title: 'Nutrition detail', metrics: NUTRITION2 },
      { id: 'stress', title: 'Stress check-in', metrics: ['stress.perceived'] }
    ],
    metrics: metricRows
  };
}

export function moodDashboard(db, params = {}) {
  const range = rangeParams(db, params, 90);
  const trends = metricTrends(db, MOOD, range);
  return {
    range,
    score: averageLatest(db, MOOD, range),
    trends,
    patterns: patterns(trends),
    correlations: correlations(db, { days: range.days, metrics: [...MOOD, 'sleep.duration', 'fitness.session_volume', 'nutrition.calories'].join(',') }).correlations,
    wellbeing_trends: wellbeingTrends(db, params)
  };
}

export function wellbeingTrends(db, params = {}) {
  const range = rangeParams(db, params, 180);
  return { range, trends: metricTrends(db, [...MOOD, 'score.stress', 'score.recovery', 'sleep.duration'], range) };
}

export function symptomDashboard(db, params = {}) {
  const range = rangeParams(db, params, 180);
  const rows = observations(db, SYMPTOMS, range);
  const bySymptom = groupBy(rows, r => json(r.metadata)?.symptom || 'unspecified');
  const timelines = Object.entries(bySymptom).map(([symptom, items]) => ({
    symptom,
    category: json(items[0].metadata)?.category || 'general',
    points: items.map(r => ({ timestamp: r.timestamp, value: r.value })),
    recurrence: recurrence(items)
  }));
  return {
    range,
    timelines,
    burden_score: latestAvg(rows),
    recurring_patterns: timelines.filter(t => t.recurrence.count >= 3),
    correlations: correlations(db, { days: range.days, metrics: ['symptom.severity', 'sleep.duration', 'nutrition.calories', 'fitness.session_volume'].join(',') }).correlations
  };
}

export function bodyCompositionDashboard(db, params = {}) {
  const range = rangeParams(db, params, 365);
  const trends = metricTrends(db, COMPOSITION, range);
  const fat = trendMap(trends).get('body.fat_percent');
  const muscle = trendMap(trends).get('body.muscle_mass');
  return {
    range,
    trends,
    recomposition: {
      status: fat?.delta < 0 && muscle?.delta > 0 ? 'positive_recomposition' : 'insufficient_or_neutral',
      fat_delta: fat?.delta ?? null,
      muscle_delta: muscle?.delta ?? null
    },
    correlations: correlations(db, { days: range.days, metrics: [...COMPOSITION, 'nutrition.calories', 'nutrition.protein', 'fitness.session_volume'].join(',') }).correlations
  };
}

export function sleepAdvanced(db, params = {}) {
  const range = rangeParams(db, params, 90);
  const trends = metricTrends(db, SLEEP, range);
  const duration = trendMap(trends).get('sleep.duration');
  const bedtime = values(db, 'sleep.bedtime', range);
  const wake = values(db, 'sleep.wake_time', range);
  const debt = sleepDebt(db, range);
  return {
    range,
    stages: metricTrends(db, ['sleep.deep', 'sleep.rem', 'sleep.light', 'sleep.awake'], range),
    consistency: consistency([...bedtime, ...wake].map(r => r.value)),
    bedtime_patterns: summarizeValues(bedtime),
    wake_time_patterns: summarizeValues(wake),
    social_jetlag: socialJetlag(db, range),
    deficits: debt.days_below_target,
    sleep_debt: debt,
    quality_score: sleepQuality(duration, debt),
    prediction: predictions(db, { days: range.days, to: range.to, horizon: 7, metrics: 'sleep.duration' }).predictions[0] || null,
    trends
  };
}

export function nutritionIntelligence(db, params = {}) {
  const range = rangeParams(db, params, 90);
  const trends = metricTrends(db, NUTRITION2, range);
  const latest = latestMap(db, NUTRITION2, range);
  const deficiencies = [
    latest.get('nutrition.fiber')?.value < 25 ? 'fiber' : null,
    latest.get('nutrition.water')?.value < 2 ? 'water' : null,
    latest.get('nutrition.micronutrient_index')?.value < 70 ? 'micronutrients' : null
  ].filter(Boolean);
  const excesses = [
    latest.get('nutrition.sodium')?.value > 2300 ? 'sodium' : null
  ].filter(Boolean);
  return {
    range,
    trends,
    quality_score: nutritionQuality(latest),
    deficiencies,
    excesses,
    meal_timing: latest.get('nutrition.meal_timing_score') || null,
    scores: { quality: nutritionQuality(latest), consistency: consistency(trends.map(t => t.avg).filter(v => v != null)) }
  };
}

export function recoveryIntelligence(db, params = {}) {
  const range = rangeParams(db, params, 90);
  const trends = metricTrends(db, RECOVERY2, range);
  const fatigue = fatigueScore(db, range);
  const warnings = [];
  if (fatigue >= 70) warnings.push({ type: 'accumulating_fatigue', severity: fatigue >= 85 ? 'high' : 'medium', score: fatigue });
  const capacity = 100 - fatigue;
  return {
    range,
    model: 'HRV + sleep + resting-heart-rate + training-load balance',
    trends,
    fatigue,
    insufficient_recovery: fatigue >= 70,
    capacity,
    predicted_recovery_days: Math.max(0, Math.round(fatigue / 25)),
    warnings,
    report: { summary: fatigue >= 70 ? 'Recovery is constrained.' : 'Recovery is acceptable.', evidence: trends },
    comparisons: compareWindows(db, RECOVERY2, range)
  };
}

export function trainingIntelligence(db, params = {}) {
  const range = rangeParams(db, params, 120);
  const trends = metricTrends(db, TRAINING2, range);
  const volume = trendMap(trends).get('fitness.session_volume');
  const plateau = volume && Math.abs(volume.delta || 0) < Math.max(1, Math.abs(volume.avg || 0) * 0.02);
  const regression = volume && (volume.delta || 0) < 0;
  const fatigue = fatigueScore(db, range);
  return {
    range,
    trends,
    plateaus: plateau ? [{ metric: 'fitness.session_volume', evidence: volume }] : [],
    regression: regression ? [{ metric: 'fitness.session_volume', evidence: volume }] : [],
    response: trendMap(trends).get('score.training_response') || null,
    adaptation: volume?.delta > 0 && fatigue < 70 ? 'positive' : fatigue >= 70 ? 'limited_by_recovery' : 'neutral',
    prediction: predictions(db, { days: range.days, to: range.to, horizon: 14, metrics: 'fitness.session_volume' }).predictions[0] || null,
    overtraining: fatigue >= 80,
    underload: volume?.avg != null && volume.avg < 1000,
    recommendations: trainingRecommendations(volume, fatigue),
    report: { summary: 'Training intelligence combines load trend with recovery state.', fatigue, volume }
  };
}

export function longitudinal(db, params = {}) {
  const range = rangeParams(db, params, 3650);
  const metric = params.metric || 'body.weight';
  const yearly = db.prepare(`
    SELECT substr(timestamp, 1, 4) AS year, AVG(value) AS avg, MIN(value) AS min, MAX(value) AS max, COUNT(*) AS n
      FROM observations WHERE metric_type = ? GROUP BY year ORDER BY year
  `).all(metric);
  return {
    range,
    metric,
    year_comparison: yearly.map(roundStats),
    seasonality: seasonal(db, metric),
    annual_trends: yearly,
    cycles: recurringCycles(db, metric),
    milestones: db.prepare('SELECT * FROM health_milestones ORDER BY timestamp DESC LIMIT 50').all(),
    comparisons: compareWindows(db, [metric], range),
    life_course: { first: yearly[0] || null, latest: yearly[yearly.length - 1] || null },
    projections: predictions(db, { days: Math.min(range.days, 730), to: range.to, horizon: 90, metrics: metric }).predictions
  };
}

export function baselines(db, params = {}) {
  const range = rangeParams(db, params, 365);
  const items = BASELINE_METRICS.map(metric => baseline(db, metric, range)).filter(Boolean);
  return {
    range,
    baselines: items,
    deviations: items.filter(i => Math.abs(i.z || 0) >= 1.5),
    alerts: items.filter(i => Math.abs(i.z || 0) >= 2).map(i => ({ metric: i.metric, z: i.z, severity: Math.abs(i.z) >= 3 ? 'high' : 'medium' })),
    trends: metricTrends(db, BASELINE_METRICS, range),
    principle: 'Personal baseline is primary; population ranges are secondary context.'
  };
}

export function risks(db, params = {}) {
  const range = rangeParams(db, params, 365);
  const base = baselines(db, params);
  const abnormal = base.alerts;
  // "Sudden" change = recent (≤30-day) window, not the full range. metricTrends
  // keys off from/to, so the window must be recomputed — overriding only `days`
  // is a no-op and would silently scan the whole range.
  const recentDays = Math.min(range.days, 30);
  const recent = { to: range.to, days: recentDays, from: dateAdd(range.to, -recentDays + 1) };
  const sudden = metricTrends(db, RISK_METRICS, recent).filter(t => Math.abs(t.delta || 0) > Math.abs(t.avg || 1) * 0.15);
  const deterioration = metricTrends(db, RISK_METRICS, range).filter(t => deteriorationSignal(t));
  const indicators = [...abnormal.map(a => ({ type: 'baseline_deviation', ...a })), ...sudden.map(s => ({ type: 'sudden_change', metric: s.metric, evidence: s })), ...deterioration.map(d => ({ type: 'deterioration', metric: d.metric, evidence: d }))];
  return {
    range,
    abnormal_trends: abnormal,
    sudden_changes: sudden,
    deterioration,
    recovery: deterioration.filter(d => d.metric.includes('recovery') || d.metric.includes('hrv')),
    sleep: deterioration.filter(d => d.metric.includes('sleep')),
    cardiovascular: indicators.filter(i => ['heart.resting_rate', 'heart.hrv_sdnn', 'blood.apob'].includes(i.metric)),
    metabolic: indicators.filter(i => ['blood.glucose', 'blood.hba1c', 'body.weight'].includes(i.metric)),
    indicators,
    early_warnings: indicators.slice(0, 10),
    risk_score: Math.min(100, indicators.length * 12)
  };
}

export function insights(db, params = {}) {
  const risk = risks(db, params);
  const recovery = recoveryIntelligence(db, params);
  const training = trainingIntelligence(db, params);
  const mood = moodDashboard(db, params);
  const out = [];
  for (const item of risk.early_warnings) out.push(makeInsight('risk', item.metric || item.type, 'Risk signal detected', 80, 70, item));
  if (recovery.fatigue >= 70) out.push(makeInsight('recovery', 'Recovery is limiting capacity', recovery.report.summary, 75, 70, recovery));
  if (training.overtraining) out.push(makeInsight('training', 'Training load may exceed recovery', 'High fatigue with training load present.', 70, 65, training));
  if (mood.score != null && mood.score < 50) out.push(makeInsight('wellbeing', 'Mood score is low', 'Mood, energy or motivation are below recent target.', 60, 60, mood));
  out.push(...decisionSupport(db).recommendations.map(r => makeInsight(r.type, r.message, r.message, 55, 55, r)));
  out.sort((a, b) => (b.impact + b.confidence) - (a.impact + a.confidence));
  return { generated_at: new Date().toISOString(), insights: out };
}

export function insightTimeline(db, params = {}) {
  return { generated: insights(db, params).insights, history: insightHistory(db).history };
}

export function insightHistory(db) {
  return { history: db.prepare('SELECT * FROM insight_events ORDER BY generated_at DESC LIMIT 100').all().map(r => ({ ...r, evidence: json(r.evidence), source_data: json(r.source_data) })) };
}

export function platformHome(db) {
  return {
    brief: brief(db, 'daily'),
    profile: healthProfile(db),
    insights: insights(db).insights.slice(0, 5),
    risks: risks(db).early_warnings.slice(0, 5),
    baselines: baselines(db).baselines,
    workflows: trackingSchema(db).forms
  };
}

function sleepDebt(db, range) {
  const rows = values(db, 'sleep.duration', range);
  const target = 8;
  const deficits = rows.map(r => Math.max(0, target - r.value));
  return { target_hours: target, total_hours: round(deficits.reduce((a, b) => a + b, 0)), days_below_target: deficits.filter(x => x > 0).length };
}

function socialJetlag(db, range) {
  const wake = values(db, 'sleep.wake_time', range);
  if (wake.length < 7) return null;
  const weekday = wake.filter(r => new Date(r.timestamp + 'T00:00:00Z').getUTCDay() >= 1 && new Date(r.timestamp + 'T00:00:00Z').getUTCDay() <= 5).map(r => r.value);
  const weekend = wake.filter(r => [0, 6].includes(new Date(r.timestamp + 'T00:00:00Z').getUTCDay())).map(r => r.value);
  if (!weekday.length || !weekend.length) return null;
  return round(Math.abs(mean(weekend) - mean(weekday)));
}

function sleepQuality(durationTrend, debt) {
  if (!durationTrend || durationTrend.avg == null) return null;
  return Math.max(0, Math.min(100, round((durationTrend.avg / 8) * 100 - debt.total_hours)));
}

function nutritionQuality(latest) {
  let score = 50;
  if ((latest.get('nutrition.fiber')?.value || 0) >= 25) score += 15;
  if ((latest.get('nutrition.water')?.value || 0) >= 2) score += 10;
  if ((latest.get('nutrition.sodium')?.value || 0) <= 2300) score += 10;
  score += Math.min(15, (latest.get('nutrition.micronutrient_index')?.value || 0) * 0.15);
  return round(Math.min(100, score));
}

function fatigueScore(db, range) {
  const b = baselines(db, range);
  const hrv = b.baselines.find(x => x.metric === 'heart.hrv_sdnn');
  const sleep = b.baselines.find(x => x.metric === 'sleep.duration');
  // Keep RHR local to fatigue scoring so /baselines output remains stable.
  const rhr = baseline(db, 'heart.resting_rate', range);
  let score = 20;
  if (hrv?.z < -1) score += 25;
  if (sleep?.z < -1) score += 25;
  if (rhr?.z > 1) score += 20;
  return Math.min(100, score);
}

function trainingRecommendations(volume, fatigue) {
  if (fatigue >= 80) return ['Prioritize recovery before adding load.'];
  if (volume?.avg != null && volume.avg < 1000) return ['Increase weekly training stimulus gradually if recovery stays stable.'];
  return ['Maintain current load and monitor recovery response.'];
}

function recurrence(items) {
  const days = new Set(items.map(i => i.timestamp));
  return { count: days.size, latest: items[items.length - 1]?.timestamp || null };
}

function deteriorationSignal(t) {
  if (t.delta == null) return false;
  if (['heart.resting_rate', 'blood.apob', 'blood.glucose', 'blood.hba1c', 'blood.crp', 'score.stress'].includes(t.metric)) return t.delta > 0;
  if (['heart.hrv_sdnn', 'sleep.duration', 'score.recovery'].includes(t.metric)) return t.delta < 0;
  return false;
}

function makeInsight(category, title, summary, impact, confidence, evidence) {
  return { category, title, summary, impact, confidence, evidence, source_data: evidence, uncertainty: confidence >= 75 ? 'low' : confidence >= 55 ? 'medium' : 'high' };
}

function summarizeValues(rows) {
  if (!rows.length) return { n: 0, avg: null, consistency: null };
  const nums = rows.map(r => r.value);
  return { n: nums.length, avg: round(mean(nums)), consistency: consistency(nums) };
}

function latestAvg(rows) { return rows.length ? round(mean(rows.slice(-7).map(r => r.value))) : null; }
