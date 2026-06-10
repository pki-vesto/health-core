// Generic time-series read + stat helpers, extracted from platform.js (task #18)
// so the platform module keeps only domain-facing models and scoring. Behaviour
// is identical to the previous in-file helpers — locked by test/platform.test.mjs
// and the live smoke suite. No domain policy lives here.
import { BadRequest, isDate } from './query.js';

// ── range / dates ────────────────────────────────────────────────────────────
export function rangeParams(db, params, fallbackDays) {
  const days = clampInt(params.days, fallbackDays, 1, 3650);
  const to = checkedDate(params.to) || db.prepare("SELECT date('now') AS d").get().d;
  return { from: dateAdd(to, -days + 1), to, days };
}

export function checkedDate(s) {
  if (s == null || s === '') return null;
  if (!isDate(String(s))) throw new BadRequest('date must be YYYY-MM-DD');
  return String(s);
}

export function clampInt(v, fallback, min, max) {
  let n = parseInt(v ?? fallback, 10);
  if (!Number.isFinite(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}

export function dateAdd(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function metricExists(db, metric) {
  return !!db.prepare('SELECT 1 FROM metric_types WHERE key = ?').get(metric);
}

// ── series reads ─────────────────────────────────────────────────────────────
export function metricTrends(db, metrics, range) {
  return metrics.filter(m => metricExists(db, m)).map(metric => {
    const rows = values(db, metric, range);
    if (!rows.length) return { metric, n: 0, avg: null, min: null, max: null, delta: null, direction: 'unknown', points: [] };
    const nums = rows.map(r => r.value);
    const delta = rows.length > 1 ? rows[rows.length - 1].value - rows[0].value : 0;
    return { metric, n: rows.length, avg: round(mean(nums)), min: round(Math.min(...nums)), max: round(Math.max(...nums)), delta: round(delta), direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', points: rows.map(r => ({ timestamp: r.timestamp, value: r.value })) };
  });
}

export function observations(db, metrics, range) {
  return db.prepare(`
    SELECT timestamp, metric_type, value, unit, metadata
      FROM observations
     WHERE timestamp BETWEEN ? AND ? AND metric_type IN (${metrics.map(() => '?').join(',')})
     ORDER BY timestamp
  `).all(range.from, range.to, ...metrics);
}

export function values(db, metric, range) {
  if (!metricExists(db, metric)) return [];
  return db.prepare(`
    SELECT timestamp, AVG(value) AS value FROM observations
     WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
     GROUP BY timestamp ORDER BY timestamp
  `).all(metric, range.from, range.to);
}

export function latestMap(db, metrics, range) {
  const rows = observations(db, metrics, range).reverse();
  const m = new Map();
  for (const r of rows) if (!m.has(r.metric_type)) m.set(r.metric_type, r);
  return m;
}

export function averageLatest(db, metrics, range) {
  const latest = latestMap(db, metrics, range);
  const nums = [...latest.values()].map(r => r.value).filter(Number.isFinite);
  return nums.length ? round(mean(nums)) : null;
}

export function patterns(trends) {
  return trends.filter(t => t.n > 1).map(t => ({ metric: t.metric, direction: t.direction, delta: t.delta, confidence: t.n >= 14 ? 'medium' : 'low' }));
}

export function baseline(db, metric, range) {
  const rows = values(db, metric, range);
  if (rows.length < 3) return null;
  const nums = rows.map(r => r.value);
  const avg = mean(nums), sd = stddev(nums, avg), latest = nums[nums.length - 1];
  return { metric, n: nums.length, baseline: round(avg), latest: round(latest), sd: round(sd), z: sd ? round((latest - avg) / sd) : 0 };
}

export function compareWindows(db, metrics, range) {
  const prev = { to: dateAdd(range.from, -1), from: dateAdd(range.from, -range.days), days: range.days };
  const current = metricTrends(db, metrics, range);
  const previous = trendMap(metricTrends(db, metrics, prev));
  return current.map(c => ({ metric: c.metric, current_avg: c.avg, previous_avg: previous.get(c.metric)?.avg ?? null, delta: previous.get(c.metric)?.avg == null || c.avg == null ? null : round(c.avg - previous.get(c.metric).avg) }));
}

export function seasonal(db, metric) {
  if (!metricExists(db, metric)) return [];
  return db.prepare(`
    SELECT CAST(strftime('%m', timestamp) AS INTEGER) AS month, AVG(value) AS avg, COUNT(*) AS n
      FROM observations WHERE metric_type = ? GROUP BY month ORDER BY month
  `).all(metric).map(roundStats);
}

export function recurringCycles(db, metric) {
  const s = seasonal(db, metric);
  if (s.length < 6) return [];
  const avg = mean(s.map(x => x.avg));
  return s.filter(x => Math.abs(x.avg - avg) > Math.abs(avg) * 0.05);
}

// ── stats / format ───────────────────────────────────────────────────────────
export function consistency(nums) {
  if (nums.length < 2) return null;
  const avg = mean(nums);
  return round(Math.max(0, 100 - (stddev(nums, avg) / Math.max(1, Math.abs(avg))) * 100));
}

export function trendMap(trends) { return new Map(trends.map(t => [t.metric, t])); }
export function groupBy(xs, fn) { return xs.reduce((m, x) => ((m[fn(x)] ||= []).push(x), m), {}); }
export function json(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }
export function mean(xs) { return xs.reduce((a, b) => a + b, 0) / xs.length; }
export function stddev(xs, avg = mean(xs)) { return Math.sqrt(xs.reduce((a, x) => a + (x - avg) ** 2, 0) / xs.length); }
export function round(x) { return x == null ? null : Math.round(Number(x) * 100) / 100; }
export function roundStats(r) { return Object.fromEntries(Object.entries(r).map(([k, v]) => typeof v === 'number' ? [k, round(v)] : [k, v])); }
