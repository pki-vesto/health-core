import { BadRequest, isDate, preferLatest } from './query.js';
import { dashboard, correlations } from './intelligence.js';

const BIOMARKERS = [
  'blood.total_cholesterol',
  'blood.ldl_cholesterol',
  'blood.hdl_cholesterol',
  'blood.triglycerides',
  'blood.apob',
  'blood.glucose',
  'blood.hba1c',
  'blood.crp',
  'blood.vitamin_d',
  'blood.ferritin',
  'hormone.testosterone',
  'hormone.cortisol'
];

const STRESS_METRICS = ['stress.perceived', 'heart.hrv_sdnn', 'sleep.duration', 'heart.resting_rate'];

export function biomarkerRegistry(db) {
  return {
    biomarkers: db.prepare(`
      SELECT metric_key, category, specimen, loinc, description
        FROM biomarker_registry ORDER BY category, metric_key
    `).all()
  };
}

export function referenceRanges(db, params = {}) {
  const metric = params.metric ? String(params.metric) : null;
  const args = [];
  let where = '';
  if (metric) { where = 'WHERE metric_key = ?'; args.push(metric); }
  return {
    ranges: db.prepare(`
      SELECT metric_key, sex, age_min, age_max, low, high, optimal_low, optimal_high, unit, source
        FROM biomarker_reference_ranges ${where}
       ORDER BY metric_key, sex, age_min
    `).all(...args)
  };
}

export function biomarkerDashboard(db, params = {}) {
  const range = rangeParams(db, params, 365);
  return {
    range,
    registry: biomarkerRegistry(db).biomarkers.length,
    trends: BIOMARKERS.map(metric => biomarkerTrend(db, metric, range.from, range.to)).filter(t => t.n > 0),
    abnormal: abnormalBiomarkers(db, params).abnormal,
    scorecard: biomarkerScorecard(db, params)
  };
}

export function biomarkerTrend(db, metric, from, to) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n, AVG(value) AS avg, MIN(value) AS min, MAX(value) AS max,
           MIN(timestamp) AS first_date, MAX(timestamp) AS last_date
      FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
  `).get(metric, from, to);
  const last = db.prepare(`
    SELECT timestamp, value, unit FROM observations
     WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
     ORDER BY timestamp DESC, updated_at DESC LIMIT 1
  `).get(metric, from, to);
  return { metric, ...roundRow(row), latest: last || null };
}

export function biomarkerTrends(db, params = {}) {
  const range = rangeParams(db, params, 365);
  const metrics = listParam(params.metrics, BIOMARKERS);
  return { range, trends: metrics.map(m => biomarkerTrend(db, m, range.from, range.to)).filter(t => t.n > 0) };
}

export function abnormalBiomarkers(db, params = {}) {
  const range = rangeParams(db, params, 365);
  const latest = latestFor(db, BIOMARKERS, range.from, range.to);
  const abnormal = [];
  for (const r of latest) {
    const ref = referenceFor(db, r.metric_type, params);
    if (!ref) continue;
    const low = ref.optimal_low ?? ref.low;
    const high = ref.optimal_high ?? ref.high;
    const status = r.value < low ? 'low' : r.value > high ? 'high' : 'normal';
    if (status !== 'normal') abnormal.push({ metric: r.metric_type, timestamp: r.timestamp, value: r.value, unit: r.unit, status, reference: ref });
  }
  return { range, abnormal };
}

export function biomarkerScorecard(db, params = {}) {
  const range = rangeParams(db, params, 365);
  const latest = latestFor(db, BIOMARKERS, range.from, range.to);
  let scored = 0, normal = 0;
  for (const r of latest) {
    const ref = referenceFor(db, r.metric_type, params);
    if (!ref) continue;
    scored++;
    const low = ref.optimal_low ?? ref.low;
    const high = ref.optimal_high ?? ref.high;
    if (r.value >= low && r.value <= high) normal++;
  }
  return { range, measured: latest.length, scored, normal, score: scored ? Math.round((normal / scored) * 10000) / 100 : null };
}

export function biomarkerCorrelations(db, params = {}) {
  const metrics = params.metrics || BIOMARKERS.join(',');
  return correlations(db, { ...params, metrics });
}

export function bloodworkOverview(db, params = {}) {
  return {
    cholesterol: panel(db, ['blood.total_cholesterol', 'blood.ldl_cholesterol', 'blood.hdl_cholesterol', 'blood.triglycerides'], params),
    apob: panel(db, ['blood.apob'], params),
    glucose: panel(db, ['blood.glucose', 'blood.hba1c'], params),
    inflammation: panel(db, ['blood.crp'], params),
    hormones: panel(db, ['hormone.testosterone', 'hormone.cortisol'], params),
    vitamins: panel(db, ['blood.vitamin_d'], params),
    minerals: panel(db, ['blood.ferritin'], params),
    cardiometabolic_score: cardiometabolicScore(db, params)
  };
}

export function cardiometabolicScore(db, params = {}) {
  const score = biomarkerScorecard(db, { ...params, metrics: 'blood.apob,blood.glucose,blood.hba1c,blood.crp,blood.triglycerides,blood.hdl_cholesterol' });
  return { ...score, model: 'reference-range-normal-count' };
}

export function stressSummary(db, params = {}) {
  const range = rangeParams(db, params, 30);
  const trends = STRESS_METRICS.map(metric => biomarkerTrend(db, metric, range.from, range.to)).filter(t => t.n > 0);
  return {
    range,
    data_model: { metrics: STRESS_METRICS, primary: 'stress.perceived', context: ['hrv', 'sleep', 'performance'] },
    trends,
    correlations: correlations(db, { days: range.days, metrics: STRESS_METRICS.join(',') }).correlations,
    score: stressScore(db, range.from, range.to),
    alerts: stressAlerts(db, range.from, range.to)
  };
}

export function brief(db, period = 'daily') {
  const days = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }[period];
  if (!days) throw new BadRequest('unknown briefing period');
  const d = dashboard(db, { days });
  return {
    period,
    generated_at: new Date().toISOString(),
    summary: d.summary,
    highlights: d.cards.slice(0, 6),
    alerts: d.alerts,
    decisions: decisionSupport(db).recommendations,
    disclaimer: DECISION_DISCLAIMER
  };
}

export function healthProfile(db) {
  const latest = latestFor(db, [...BIOMARKERS, ...STRESS_METRICS, 'body.weight', 'fitness.session_volume', 'nutrition.calories'], '1900-01-01', '9999-12-31');
  return { generated_at: new Date().toISOString(), latest };
}

export function healthGoals(db) {
  return { goals: db.prepare('SELECT id, domain, title, status, evidence, updated_at FROM health_goals ORDER BY id').all() };
}

export function progress(db) {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM health_goals GROUP BY status').all();
  return { goals: Object.fromEntries(rows.map(r => [r.status, r.n])) };
}

// Non-clinical disclaimer attached to every decision-support surface. Worded so
// it states observations from the user's own data only — never directives,
// prescriptions or diagnoses. Tests (test/decision-support.test.mjs) assert
// messages stay observational and this disclaimer travels with them.
export const DECISION_DISCLAIMER =
  'Informational context derived from your own data. It does not replace medical advice or provide a diagnosis — consult a qualified clinician for medical decisions.';

export function decisionSupport(db) {
  const recs = [];
  const abnormal = abnormalBiomarkers(db).abnormal;
  for (const a of abnormal.slice(0, 5)) {
    const name = displayName(db, a.metric);
    recs.push({
      type: 'biomarker',
      priority: a.status === 'high' ? 'review' : 'monitor',
      informational: true,
      message: `${name} is ${a.status === 'high' ? 'above' : 'below'} its reference range (latest result).`
    });
  }
  const stress = stressSummary(db);
  if (stress.score != null && stress.score >= 70) {
    recs.push({
      type: 'stress',
      priority: 'review',
      informational: true,
      message: 'Stress signals are elevated relative to your recent recovery (latest window).'
    });
  }
  return { recommendations: recs, note: DECISION_DISCLAIMER };
}

function displayName(db, key) {
  return db.prepare('SELECT display_name FROM metric_types WHERE key = ?').get(key)?.display_name || key;
}

export function operatingSystem(db) {
  return {
    status: 'operational',
    profile: healthProfile(db),
    progress: progress(db),
    today: brief(db, 'daily'),
    decision_support: decisionSupport(db)
  };
}

function panel(db, metrics, params) {
  const range = rangeParams(db, params, 365);
  return metrics.map(m => biomarkerTrend(db, m, range.from, range.to)).filter(t => t.n > 0);
}

function stressScore(db, from, to) {
  const latest = latestFor(db, STRESS_METRICS, from, to);
  if (!latest.length) return null;
  let points = 0, n = 0;
  for (const r of latest) {
    n++;
    // Each signal contributes "stress points" when it sits in its own
    // stress-elevating range. Thresholds are per-metric: low HRV is in ms,
    // short sleep is in hours — they must not share one cutoff.
    if (r.metric_type === 'heart.hrv_sdnn') points += r.value < 50 ? 70 : 30;     // low HRV (ms) → stress
    else if (r.metric_type === 'sleep.duration') points += r.value < 7 ? 70 : 30; // short sleep (h) → stress
    else points += Math.min(100, Math.max(0, r.value));                           // perceived (0-100) / resting HR (bpm)
  }
  return Math.round((points / n) * 100) / 100;
}

function stressAlerts(db, from, to) {
  const score = stressScore(db, from, to);
  return score != null && score >= 70 ? [{ type: 'chronic_stress_risk', score, severity: score >= 85 ? 'high' : 'medium' }] : [];
}

function latestFor(db, metrics, from, to) {
  if (!metrics.length) return [];
  const rows = db.prepare(`
    SELECT o.metric_type, o.timestamp, o.value, o.unit, s.name AS source,
           o.source_updated_at, o.updated_at
      FROM observations o
      JOIN sources s ON s.id = o.source
      JOIN (
        SELECT metric_type, MAX(timestamp) AS timestamp
          FROM observations
         WHERE timestamp BETWEEN ? AND ? AND metric_type IN (${metrics.map(() => '?').join(',')})
         GROUP BY metric_type
      ) x ON x.metric_type = o.metric_type AND x.timestamp = o.timestamp
     ORDER BY o.metric_type, o.updated_at DESC
  `).all(from, to, ...metrics);
  // The latest-day join can yield several rows per metric (one per source);
  // collapse to the single authoritative value via source precedence (then LWW).
  const byMetric = new Map();
  for (const r of rows) {
    const prev = byMetric.get(r.metric_type);
    if (!prev || preferLatest(r, prev)) byMetric.set(r.metric_type, r);
  }
  return [...byMetric.values()];
}

export function referenceFor(db, metric, params = {}) {
  const sex = params.sex ? String(params.sex) : 'any';
  const age = params.age != null ? Number(params.age) : 40;
  return db.prepare(`
    SELECT metric_key, sex, age_min, age_max, low, high, optimal_low, optimal_high, unit, source
      FROM biomarker_reference_ranges
     WHERE metric_key = ?
       AND (sex = ? OR sex = 'any')
       AND age_min <= ? AND age_max >= ?
     ORDER BY CASE WHEN sex = ? THEN 0 ELSE 1 END
     LIMIT 1
  `).get(metric, sex, age, age, sex);
}

function rangeParams(db, params, fallbackDays) {
  const days = clampInt(params.days, fallbackDays, 1, 3650);
  const to = checkedDate(params.to) || db.prepare("SELECT date('now') AS d").get().d;
  return { from: dateAdd(to, -days + 1), to, days };
}

function listParam(s, fallback) {
  return s ? String(s).split(',').map(x => x.trim()).filter(Boolean) : fallback;
}

function checkedDate(s) {
  if (s == null || s === '') return null;
  if (!isDate(String(s))) throw new BadRequest('date must be YYYY-MM-DD');
  return String(s);
}

function clampInt(v, fallback, min, max) {
  let n = parseInt(v ?? fallback, 10);
  if (!Number.isFinite(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}

function dateAdd(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function roundRow(row) {
  const out = { ...row };
  for (const k of ['avg', 'min', 'max']) out[k] = out[k] == null ? null : Math.round(Number(out[k]) * 10000) / 10000;
  return out;
}
