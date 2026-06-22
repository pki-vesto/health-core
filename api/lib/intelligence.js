import { isDate, BadRequest, preferLatest } from './query.js';
import { listExperiments } from './experiments.js';

const CORE_METRICS = [
  'body.weight',
  'fitness.session_volume',
  'nutrition.calories',
  'nutrition.protein',
  'nutrition.carbs',
  'nutrition.fat',
  'heart.resting_rate',
  'heart.hrv_sdnn',
  'fitness.vo2max',
  'sleep.duration',
  'activity.steps'
];

const RECOVERY_METRICS = ['heart.hrv_sdnn', 'sleep.duration', 'heart.resting_rate'];
const TRAINING_METRICS = ['fitness.session_volume', 'activity.steps', 'fitness.vo2max'];
const NUTRITION_METRICS = ['nutrition.calories', 'nutrition.protein', 'nutrition.carbs', 'nutrition.fat'];

export function platformStatus(db) {
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sources) AS sources,
      (SELECT COUNT(*) FROM metric_types WHERE status = 'active') AS metrics,
      (SELECT COUNT(*) FROM observations) AS observations,
      (SELECT COUNT(*) FROM ingest_log) AS ingests,
      (SELECT COUNT(*) FROM quarantine WHERE resolved = 0) AS open_quarantine,
      (SELECT COUNT(*) FROM health_goals WHERE status = 'complete') AS goals_complete,
      (SELECT COUNT(*) FROM health_goals) AS goals_total
  `).get();
  const latest = db.prepare('SELECT MAX(timestamp) AS last_observation FROM observations').get();
  return {
    status: counts.observations > 0 ? 'operational' : 'empty',
    goals: { completed: counts.goals_complete, total: counts.goals_total, blocked: 0, scope: '1-250' },
    counts,
    last_observation: latest.last_observation,
    invariants: ['observations-kernel', 'additive-vocabulary', 'idempotent-ingest', 'local-first', 'single-user']
  };
}

export function dashboard(db, params = {}) {
  const days = clampInt(params.days, 30, 7, 365);
  const to = checkedDate(params.to) || db.prepare("SELECT date('now') AS d").get().d;
  const from = dateAdd(to, -days + 1);
  const latest = latestByMetric(db, CORE_METRICS);
  return {
    range: { from, to, days },
    summary: scoreSummary(db, from, to),
    cards: CORE_METRICS.map(metric => ({
      metric,
      latest: latest.get(metric) || null,
      trend: trendForMetric(db, metric, from, to)
    })).filter(c => c.latest || c.trend.n > 0),
    alerts: anomalyAlerts(db, from, to)
  };
}

export function trainingSummary(db, params = {}) {
  return domainSummary(db, 'training', TRAINING_METRICS, params);
}

export function nutritionSummary(db, params = {}) {
  const out = domainSummary(db, 'nutrition', NUTRITION_METRICS, params);
  out.macro_balance = macroBalance(db, out.range.from, out.range.to);
  return out;
}

export function recoverySummary(db, params = {}) {
  const out = domainSummary(db, 'recovery', RECOVERY_METRICS, params);
  out.recovery_score = recoveryScore(db, out.range.from, out.range.to);
  return out;
}

export function correlations(db, params = {}) {
  const days = clampInt(params.days, 90, 14, 730);
  const to = checkedDate(params.to) || db.prepare("SELECT date('now') AS d").get().d;
  const from = dateAdd(to, -days + 1);
  const metrics = (params.metrics ? String(params.metrics).split(',') : CORE_METRICS)
    .map(s => s.trim()).filter(Boolean);
  for (const m of metrics) assertMetric(db, m);
  const daily = dailyMetricMap(db, metrics, from, to);
  const rows = [];
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const a = metrics[i], b = metrics[j];
      const pairs = [];
      for (const day of daily.values()) {
        if (day[a] != null && day[b] != null) pairs.push([day[a], day[b]]);
      }
      if (pairs.length >= 3) rows.push({ a, b, n: pairs.length, r: round4(pearson(pairs)) });
    }
  }
  rows.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  return { range: { from, to, days }, correlations: rows };
}

export function experimentReadiness(db) {
  const metrics = db.prepare(`
    SELECT mt.key, mt.display_name, COUNT(o.id) AS n, MIN(o.timestamp) AS first, MAX(o.timestamp) AS last
      FROM metric_types mt LEFT JOIN observations o ON o.metric_type = mt.key
     WHERE mt.status = 'active'
     GROUP BY mt.key
     ORDER BY n DESC, mt.key
  `).all();
  return {
    experiments: listExperiments(db),
    candidate_metrics: metrics.map(m => ({ ...m, ready: m.n >= 14 })),
    default_design: 'single-user baseline/test window'
  };
}

export function predictions(db, params = {}) {
  const days = clampInt(params.days, 90, 14, 730);
  const horizon = clampInt(params.horizon, 14, 1, 90);
  const to = checkedDate(params.to) || db.prepare("SELECT date('now') AS d").get().d;
  const from = dateAdd(to, -days + 1);
  const metrics = (params.metrics ? String(params.metrics).split(',') : CORE_METRICS)
    .map(s => s.trim()).filter(Boolean);
  for (const m of metrics) assertMetric(db, m);
  return {
    range: { from, to, days },
    horizon_days: horizon,
    predictions: metrics.map(metric => forecastMetric(db, metric, from, to, horizon)).filter(Boolean)
  };
}

function domainSummary(db, domain, metrics, params) {
  const days = clampInt(params.days, 30, 7, 365);
  const to = checkedDate(params.to) || db.prepare("SELECT date('now') AS d").get().d;
  const from = dateAdd(to, -days + 1);
  return {
    domain,
    range: { from, to, days },
    metrics: metrics.map(metric => ({ metric, trend: trendForMetric(db, metric, from, to) }))
  };
}

function scoreSummary(db, from, to) {
  return {
    training_load: normalizedAverage(db, 'fitness.session_volume', from, to),
    nutrition_consistency: consistencyScore(db, NUTRITION_METRICS, from, to),
    recovery: recoveryScore(db, from, to)
  };
}

function recoveryScore(db, from, to) {
  const sleep = normalizedAverage(db, 'sleep.duration', from, to, { target: 8, cap: 10 });
  const hrv = percentileLatest(db, 'heart.hrv_sdnn', from, to);
  const rhr = inversePercentileLatest(db, 'heart.resting_rate', from, to);
  return averageDefined([sleep, hrv, rhr]);
}

function macroBalance(db, from, to) {
  const row = db.prepare(`
    SELECT metric_type, AVG(value) AS avg
      FROM observations
     WHERE timestamp BETWEEN ? AND ? AND metric_type IN (${NUTRITION_METRICS.map(() => '?').join(',')})
     GROUP BY metric_type
  `).all(from, to, ...NUTRITION_METRICS);
  const m = new Map(row.map(r => [r.metric_type, r.avg]));
  const kcal = m.get('nutrition.calories') || 0;
  return {
    calories_avg: round2(kcal),
    protein_g_avg: round2(m.get('nutrition.protein')),
    carbs_g_avg: round2(m.get('nutrition.carbs')),
    fat_g_avg: round2(m.get('nutrition.fat')),
    protein_pct_energy: kcal ? round2(((m.get('nutrition.protein') || 0) * 4 / kcal) * 100) : null,
    carbs_pct_energy: kcal ? round2(((m.get('nutrition.carbs') || 0) * 4 / kcal) * 100) : null,
    fat_pct_energy: kcal ? round2(((m.get('nutrition.fat') || 0) * 9 / kcal) * 100) : null
  };
}

function anomalyAlerts(db, from, to) {
  const alerts = [];
  for (const metric of CORE_METRICS) {
    const values = db.prepare(`
      SELECT timestamp, value FROM observations
       WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
       ORDER BY timestamp
    `).all(metric, from, to);
    if (values.length < 7) continue;
    const nums = values.map(v => v.value);
    const avg = mean(nums), sd = stddev(nums, avg);
    if (!sd) continue;
    const last = values[values.length - 1];
    const z = (last.value - avg) / sd;
    if (Math.abs(z) >= 2) alerts.push({ metric, timestamp: last.timestamp, value: last.value, z: round2(z), severity: Math.abs(z) >= 3 ? 'high' : 'medium' });
  }
  return alerts;
}

function trendForMetric(db, metric, from, to) {
  if (!metricExists(db, metric)) return { n: 0, avg: null, min: null, max: null, delta: null, direction: 'unknown' };
  const row = db.prepare(`
    SELECT COUNT(*) AS n, AVG(value) AS avg, MIN(value) AS min, MAX(value) AS max
      FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
  `).get(metric, from, to);
  const endpoints = db.prepare(`
    SELECT
      (SELECT value FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp ASC LIMIT 1) AS first,
      (SELECT value FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC LIMIT 1) AS last
  `).get(metric, from, to, metric, from, to);
  const delta = endpoints.first == null || endpoints.last == null ? null : round4(endpoints.last - endpoints.first);
  return {
    n: row.n,
    avg: round4(row.avg),
    min: round4(row.min),
    max: round4(row.max),
    delta,
    direction: delta == null ? 'unknown' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  };
}

function latestByMetric(db, metrics) {
  const rows = db.prepare(`
    SELECT o.metric_type, o.timestamp, o.value, o.unit, s.name AS source,
           o.source_updated_at, o.updated_at
      FROM observations o JOIN sources s ON s.id = o.source
     WHERE o.metric_type IN (${metrics.map(() => '?').join(',')})
     ORDER BY o.metric_type, o.timestamp DESC, o.updated_at DESC
  `).all(...metrics);
  // Keep the latest calendar day per metric, then resolve same-day multi-source
  // collisions by source precedence (then LWW).
  const out = new Map();
  for (const r of rows) {
    const prev = out.get(r.metric_type);
    if (!prev) out.set(r.metric_type, r);
    else if (r.timestamp > prev.timestamp) out.set(r.metric_type, r);
    else if (r.timestamp === prev.timestamp && preferLatest(r, prev)) out.set(r.metric_type, r);
  }
  return out;
}

function dailyMetricMap(db, metrics, from, to) {
  const rows = db.prepare(`
    SELECT timestamp, metric_type, AVG(value) AS value
      FROM observations
     WHERE timestamp BETWEEN ? AND ? AND metric_type IN (${metrics.map(() => '?').join(',')})
     GROUP BY timestamp, metric_type
     ORDER BY timestamp
  `).all(from, to, ...metrics);
  const daily = new Map();
  for (const r of rows) {
    if (!daily.has(r.timestamp)) daily.set(r.timestamp, {});
    daily.get(r.timestamp)[r.metric_type] = r.value;
  }
  return daily;
}

function forecastMetric(db, metric, from, to, horizon) {
  const rows = db.prepare(`
    SELECT timestamp, AVG(value) AS value
      FROM observations
     WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
     GROUP BY timestamp ORDER BY timestamp
  `).all(metric, from, to);
  if (rows.length < 3) return null;
  const t0 = Date.parse(rows[0].timestamp + 'T00:00:00Z') / 86400000;
  const points = rows.map(r => [Date.parse(r.timestamp + 'T00:00:00Z') / 86400000 - t0, r.value]);
  const line = linear(points);
  const lastX = points[points.length - 1][0];
  return {
    metric,
    n: rows.length,
    slope_per_day: round4(line.slope),
    next: round4(line.intercept + line.slope * (lastX + horizon)),
    confidence: rows.length >= 30 ? 'medium' : 'low'
  };
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

function assertMetric(db, metric) {
  if (!metricExists(db, metric)) throw new BadRequest(`unknown metric '${metric}'`);
}

function metricExists(db, metric) {
  return !!db.prepare('SELECT 1 FROM metric_types WHERE key = ?').get(metric);
}

function dateAdd(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizedAverage(db, metric, from, to, opts = {}) {
  if (!metricExists(db, metric)) return null;
  const row = db.prepare('SELECT AVG(value) AS avg, MAX(value) AS max FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ?').get(metric, from, to);
  if (row.avg == null) return null;
  const cap = opts.cap || row.max || row.avg;
  const target = opts.target || cap;
  return round2(Math.max(0, Math.min(100, (row.avg / target) * 100)));
}

function consistencyScore(db, metrics, from, to) {
  const scores = metrics.map(metric => inverseCoefficientVariation(db, metric, from, to)).filter(v => v != null);
  return averageDefined(scores);
}

function inverseCoefficientVariation(db, metric, from, to) {
  const rows = db.prepare('SELECT value FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ?').all(metric, from, to);
  if (rows.length < 3) return null;
  const nums = rows.map(r => r.value);
  const avg = mean(nums);
  if (!avg) return null;
  return round2(Math.max(0, Math.min(100, 100 - (stddev(nums, avg) / Math.abs(avg)) * 100)));
}

function percentileLatest(db, metric, from, to) {
  const rows = db.prepare('SELECT value FROM observations WHERE metric_type = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp').all(metric, from, to);
  if (rows.length < 3) return null;
  const latest = rows[rows.length - 1].value;
  return round2((rows.filter(r => r.value <= latest).length / rows.length) * 100);
}

function inversePercentileLatest(db, metric, from, to) {
  const p = percentileLatest(db, metric, from, to);
  return p == null ? null : round2(100 - p);
}

function averageDefined(values) {
  const nums = values.filter(v => v != null && Number.isFinite(v));
  return nums.length ? round2(mean(nums)) : null;
}

function pearson(pairs) {
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < pairs.length; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

function linear(points) {
  const mx = mean(points.map(p => p[0])), my = mean(points.map(p => p[1]));
  let num = 0, den = 0;
  for (const [x, y] of points) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  const slope = den ? num / den : 0;
  return { slope, intercept: my - slope * mx };
}

function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function stddev(xs, avg = mean(xs)) { return Math.sqrt(xs.reduce((a, x) => a + (x - avg) ** 2, 0) / xs.length); }
function round2(x) { return x == null ? null : Math.round(Number(x) * 100) / 100; }
function round4(x) { return x == null ? null : Math.round(Number(x) * 10000) / 10000; }
