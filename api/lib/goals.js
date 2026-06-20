import { BadRequest, preferLatest } from './query.js';

export const GOAL_STREAK_LOOKBACK_DAYS = 365;

const COMPARATORS = new Set(['gte', 'lte', 'eq', 'range']);
const WINDOWS = new Set(['latest', 'daily']);

export function goalProgress(db, idOrOptions, maybeOptions = {}) {
  const hasId = idOrOptions != null && (typeof idOrOptions === 'number' || typeof idOrOptions === 'string');
  const id = hasId ? parseId(idOrOptions) : null;
  const options = hasId ? maybeOptions : (idOrOptions || {});
  const today = options.today || amsterdamDate();
  const goals = loadGoals(db, id);
  const out = goals.map(goal => progressForGoal(db, normalizeGoal(goal), today));
  return hasId ? (out[0] || null) : out;
}

export function progressSummary(db, options = {}) {
  const goals = goalProgress(db, options);
  const counts = { total: goals.length, on_track: 0, off_track: 0, no_data: 0 };
  for (const g of goals) counts[g.status] = (counts[g.status] || 0) + 1;
  return { goals: counts, items: goals };
}

export function resolveDailyValue(db, metricKey, day) {
  const rows = db.prepare(`
    SELECT o.timestamp, o.metric_type, o.value, o.unit, s.name AS source,
           o.source_updated_at, o.updated_at
      FROM observations o
      JOIN sources s ON s.id = o.source
     WHERE o.metric_type = ? AND substr(o.timestamp, 1, 10) = ?
     ORDER BY o.updated_at DESC
  `).all(metricKey, day);
  return preferred(rows);
}

export function resolveLatestValue(db, metricKey, today) {
  const rows = db.prepare(`
    SELECT o.timestamp, o.metric_type, o.value, o.unit, s.name AS source,
           o.source_updated_at, o.updated_at
      FROM observations o
      JOIN sources s ON s.id = o.source
      JOIN (
        SELECT MAX(substr(timestamp, 1, 10)) AS day
          FROM observations
         WHERE metric_type = ? AND substr(timestamp, 1, 10) <= ?
      ) latest ON substr(o.timestamp, 1, 10) = latest.day
     WHERE o.metric_type = ?
     ORDER BY o.updated_at DESC
  `).all(metricKey, today, metricKey);
  return preferred(rows);
}

export function evaluateComparator(value, comparator, target) {
  if (value == null) return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (comparator === 'gte') return v >= target.value;
  if (comparator === 'lte') return v <= target.value;
  if (comparator === 'eq') return Math.abs(v - target.value) <= (target.tolerance || 0);
  if (comparator === 'range') return v >= target.min && v <= target.max;
  throw new BadRequest(`unknown comparator '${comparator}'`);
}

export function percentToTarget(value, comparator, target) {
  if (value == null || comparator === 'eq') return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  if (comparator === 'gte') return target.value === 0 ? (v >= 0 ? 1 : null) : round4(Math.max(0, v / target.value));
  if (comparator === 'lte') {
    if (target.value === 0) return v <= 0 ? 1 : null;
    return round4(v <= target.value ? 1 : Math.max(0, target.value / v));
  }
  if (comparator === 'range') {
    if (target.min === target.max) return v === target.min ? 1 : 0;
    if (v >= target.min && v <= target.max) return 1;
    if (v < target.min) return target.min === 0 ? null : round4(Math.max(0, v / target.min));
    return v === 0 ? null : round4(Math.max(0, target.max / v));
  }
  return null;
}

// Missing-data days break streaks. They are counted as explicit gaps in the
// Europe/Amsterdam calendar walk rather than skipped over.
export function computeStreaks(db, goal, today, lookbackDays = GOAL_STREAK_LOOKBACK_DAYS) {
  let current = 0;
  let longest = 0;
  let run = 0;
  for (let i = 0; i < lookbackDays; i++) {
    const day = dateAdd(today, -i);
    const row = resolveDailyValue(db, goal.metric_key, day);
    const met = evaluateComparator(row?.value ?? null, goal.comparator, goal.target);
    if (met === true) {
      run++;
      if (i === current) current++;
      if (run > longest) longest = run;
    } else {
      run = 0;
      if (i === 0) current = 0;
    }
  }
  return { current_streak: current, longest_streak: longest, lookback_days: lookbackDays };
}

function progressForGoal(db, goal, today) {
  const todayRow = resolveDailyValue(db, goal.metric_key, today);
  const currentRow = goal.window === 'daily' ? todayRow : resolveLatestValue(db, goal.metric_key, today);
  const currentValue = currentRow?.value ?? null;
  const metToday = evaluateComparator(todayRow?.value ?? null, goal.comparator, goal.target);
  const percent = percentToTarget(currentValue, goal.comparator, goal.target);
  const streaks = goal.window === 'daily'
    ? computeStreaks(db, goal, today)
    : { current_streak: null, longest_streak: null, lookback_days: null };
  return {
    id: goal.id,
    title: goal.title,
    metric_key: goal.metric_key,
    comparator: goal.comparator,
    target: goal.target,
    window: goal.window,
    current_value: currentValue,
    current_timestamp: currentRow?.timestamp ?? null,
    current_source: currentRow?.source ?? null,
    met_today: metToday,
    percent_to_target: percent,
    current_streak: streaks.current_streak,
    longest_streak: streaks.longest_streak,
    streak_lookback_days: streaks.lookback_days,
    status: currentValue == null ? 'no_data' : (metToday === true ? 'on_track' : 'off_track'),
    as_of: today,
    missing_data_breaks_streak: goal.window === 'daily' ? true : null
  };
}

function loadGoals(db, id) {
  assertGoalTable(db);
  if (id != null) {
    return db.prepare(`
      SELECT id, title, metric_key, comparator, target_value, target_min, target_max, window, status
        FROM user_health_goals
       WHERE id = ?
    `).all(id);
  }
  return db.prepare(`
    SELECT id, title, metric_key, comparator, target_value, target_min, target_max, window, status
      FROM user_health_goals
     WHERE status = 'active'
     ORDER BY id
  `).all();
}

function normalizeGoal(row) {
  if (!COMPARATORS.has(row.comparator)) throw new BadRequest(`unknown comparator '${row.comparator}'`);
  if (!WINDOWS.has(row.window)) throw new BadRequest(`unknown goal window '${row.window}'`);
  const target = row.comparator === 'range'
    ? { min: Number(row.target_min), max: Number(row.target_max) }
    : { value: Number(row.target_value) };
  return { ...row, target };
}

function preferred(rows) {
  let winner = null;
  for (const r of rows) {
    if (!winner || preferLatest(r, winner)) winner = r;
  }
  return winner;
}

function assertGoalTable(db) {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_health_goals'").get();
  if (!exists) throw new BadRequest("missing table 'user_health_goals'; run migrations");
}

function parseId(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new BadRequest('goal id must be a positive integer');
  return n;
}

function amsterdamDate(d = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateAdd(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function round4(x) {
  return x == null ? null : Math.round(Number(x) * 10000) / 10000;
}
