import { createHash } from 'node:crypto';
import { BadRequest, isDate, preferLatest } from './query.js';
import { dashboard, correlations } from './intelligence.js';
import { progressSummary } from './goals.js';

export const BRIEFING_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

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
    generated_at: amsterdamNowIso(),
    summary: d.summary,
    highlights: d.cards.slice(0, 6),
    alerts: d.alerts,
    decisions: decisionSupport(db).recommendations,
    disclaimer: DECISION_DISCLAIMER
  };
}

// ── Briefing persistence (issue #32) ─────────────────────────────────────────
// `brief()` recomputes; this helper persists each result so /briefing/history
// and /briefing/:id/diff can stand on a stable artifact. Day-bucket via
// Europe/Amsterdam (NOT UTC) so dedupe-by-day stays correct across midnight
// local time. Dedupe by (period, payload_sha256, day) returns the existing row
// id rather than creating a duplicate row when the same briefing is regenerated
// the same day.
export function snapshotBriefing(db, briefing, { period } = {}) {
  const periodKey = period || briefing?.period;
  if (!BRIEFING_PERIODS.includes(periodKey)) {
    throw new BadRequest(`unknown briefing period '${periodKey}'`);
  }
  let payload;
  try {
    payload = JSON.stringify(briefing);
  } catch {
    return { id: null, deduped: false, skipped: true };
  }
  const sha = sha256Hex(payload);
  const generatedAt = briefing?.generated_at || amsterdamNowIso();
  const day = generatedAt.slice(0, 10);
  const existing = db.prepare(
    `SELECT id FROM briefing_snapshots
      WHERE period = ? AND payload_sha256 = ? AND substr(generated_at, 1, 10) = ?
      LIMIT 1`
  ).get(periodKey, sha, day);
  if (existing) return { id: existing.id, deduped: true };
  const summary = briefing && typeof briefing.summary === 'object' && briefing.summary !== null
    ? JSON.stringify(briefing.summary)
    : (briefing?.summary ?? null);
  const info = db.prepare(
    `INSERT INTO briefing_snapshots (period, generated_at, payload, payload_sha256, summary)
     VALUES (?, ?, ?, ?, ?)`
  ).run(periodKey, generatedAt, payload, sha, summary);
  return { id: Number(info.lastInsertRowid), deduped: false };
}

// Generate + persist in one call. The read API uses this so every served brief
// is also a row in briefing_snapshots; callers get the snapshot id back so they
// can immediately /briefing/:id and /:id/diff.
export function briefAndSnapshot(readDb, writeDb, period = 'daily') {
  const briefing = brief(readDb, period);
  let snap = { id: null, deduped: false, skipped: true };
  try { snap = snapshotBriefing(writeDb, briefing, { period }); }
  catch { /* never break the read path on a persistence failure */ }
  return { ...briefing, snapshot_id: snap.id, deduped: !!snap.deduped };
}

export function listBriefingSnapshots(db, { period, limit = 20 } = {}) {
  if (period != null && !BRIEFING_PERIODS.includes(period)) {
    throw new BadRequest(`unknown briefing period '${period}'`);
  }
  const n = clampInt(limit, 20, 1, 100);
  const args = [];
  let where = '';
  if (period) { where = 'WHERE period = ?'; args.push(period); }
  args.push(n);
  return db.prepare(
    `SELECT id, period, generated_at, summary
       FROM briefing_snapshots ${where}
      ORDER BY generated_at DESC, id DESC
      LIMIT ?`
  ).all(...args).map(r => ({ ...r, summary: safeJson(r.summary) }));
}

export function getBriefingSnapshot(db, id) {
  const row = db.prepare(
    `SELECT id, period, generated_at, payload, payload_sha256, summary
       FROM briefing_snapshots WHERE id = ?`
  ).get(id);
  if (!row) return null;
  return { ...row, payload: safeJson(row.payload) };
}

export function priorBriefingSnapshot(db, { period, id }) {
  const row = db.prepare(
    `SELECT id, period, generated_at, payload, payload_sha256, summary
       FROM briefing_snapshots
      WHERE period = ? AND id < ?
      ORDER BY id DESC LIMIT 1`
  ).get(period, id);
  if (!row) return null;
  return { ...row, payload: safeJson(row.payload) };
}

function amsterdamNowIso(d = new Date()) {
  // ISO8601 in Europe/Amsterdam (with offset suffix). Built from Intl parts so
  // the day-bucket prefix (substr 1..10) is the local civil date — not UTC.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  // Hour can be '24' on some runtimes for midnight; coerce to '00'.
  const hh = parts.hour === '24' ? '00' : parts.hour;
  const offset = amsterdamOffset(d);
  return `${parts.year}-${parts.month}-${parts.day}T${hh}:${parts.minute}:${parts.second}${offset}`;
}

function amsterdamOffset(d) {
  // Amsterdam = CET (UTC+1) in winter, CEST (UTC+2) in summer. Compute by
  // diffing the same wall clock interpreted in UTC vs Europe/Amsterdam.
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  const mins = Math.round((local - utc) / 60000);
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

function sha256Hex(s) {
  return createHash('sha256').update(s).digest('hex');
}

function safeJson(s) {
  if (s == null) return null;
  try { return JSON.parse(s); } catch { return s; }
}

export function healthProfile(db) {
  const latest = latestFor(db, [...BIOMARKERS, ...STRESS_METRICS, 'body.weight', 'fitness.session_volume', 'nutrition.calories'], '1900-01-01', '9999-12-31');
  return { generated_at: new Date().toISOString(), latest };
}

export function healthGoals(db) {
  return { goals: db.prepare('SELECT id, domain, title, status, evidence, updated_at FROM health_goals ORDER BY id').all() };
}

export function progress(db) {
  try {
    return progressSummary(db);
  } catch (e) {
    if (!String(e.message || '').includes("missing table 'user_health_goals'")) throw e;
    const rows = db.prepare('SELECT status, COUNT(*) AS n FROM health_goals GROUP BY status').all();
    return { goals: Object.fromEntries(rows.map(r => [r.status, r.n])) };
  }
}

// Non-clinical disclaimer attached to every decision-support surface. Worded so
// it states observations from the user's own data only — never directives,
// prescriptions or diagnoses. Tests (test/decision-support.test.mjs) assert
// messages stay observational and this disclaimer travels with them.
export const DECISION_DISCLAIMER =
  'Informational context derived from your own data. It does not replace medical advice or provide a diagnosis — consult a qualified clinician for medical decisions.';

// Deterministic identifier for a recommendation. Built from `type` + a strong
// subject (metric > subject > a fixed slug) so the SAME logical recommendation
// gets the SAME rec_key across recomputes — that is the join key the lifecycle
// layer (recommendation_actions) writes against. Never include timestamps or
// recompute counters here, otherwise actions would never bind to a future
// instance of the same recommendation. Subject is normalised to lower-kebab so
// callers cannot accidentally fork a key by changing casing or whitespace.
export function recKey({ type, metric, subject } = {}) {
  const t = String(type || 'unknown').trim().toLowerCase();
  const raw = metric ?? subject ?? 'general';
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '-');
  return `${t}:${s}`;
}

// Lifecycle filter: returns the latest action row per rec_key. Used by the
// read path (decisionSupport) to drop dismissed/done items and snoozed items
// whose snooze_until has not yet been reached. Resilient to the migration
// being absent (older DBs) — returns an empty map so the read path degrades
// gracefully instead of 500-ing.
export function latestRecommendationActions(db) {
  try {
    const rows = db.prepare(
      `SELECT a.rec_key, a.status, a.snooze_until, a.created_at
         FROM recommendation_actions a
         JOIN (
           SELECT rec_key, MAX(id) AS max_id
             FROM recommendation_actions
            GROUP BY rec_key
         ) latest ON latest.max_id = a.id`
    ).all();
    const out = new Map();
    for (const r of rows) out.set(r.rec_key, r);
    return out;
  } catch {
    return new Map();
  }
}

// True iff the LATEST action for a rec_key means it should NOT be surfaced
// right now. Dismissed/done hide it forever (until a new action is recorded);
// snoozed hides it until `snooze_until` (Europe/Amsterdam ISO) is reached.
// `now` defaults to current Amsterdam time so the read path uses the SAME
// civil clock the snooze was written against.
export function isRecHiddenByAction(latest, nowIso = amsterdamNowIso()) {
  if (!latest) return false;
  if (latest.status === 'dismissed' || latest.status === 'done') return true;
  if (latest.status === 'snoozed') {
    const until = latest.snooze_until;
    if (!until) return false; // malformed → don't hide (don't lose the rec)
    return String(until) > String(nowIso); // lexicographic ISO compare
  }
  return false;
}

export function decisionSupport(db) {
  const recs = [];
  const abnormal = abnormalBiomarkers(db).abnormal;
  for (const a of abnormal.slice(0, 5)) {
    const name = displayName(db, a.metric);
    recs.push({
      type: 'biomarker',
      rec_key: recKey({ type: 'biomarker', metric: a.metric }),
      priority: a.status === 'high' ? 'review' : 'monitor',
      informational: true,
      message: `${name} is ${a.status === 'high' ? 'above' : 'below'} its reference range (latest result).`
    });
  }
  const stress = stressSummary(db);
  if (stress.score != null && stress.score >= 70) {
    recs.push({
      type: 'stress',
      rec_key: recKey({ type: 'stress', subject: 'overall' }),
      priority: 'review',
      informational: true,
      message: 'Stress signals are elevated relative to your recent recovery (latest window).'
    });
  }
  // Lifecycle filter: drop dismissed/done and unexpired snoozes. Wording and
  // `informational:true` invariants are preserved on whatever survives.
  const latest = latestRecommendationActions(db);
  const nowIso = amsterdamNowIso();
  const visible = recs.filter(r => !isRecHiddenByAction(latest.get(r.rec_key), nowIso));
  return { recommendations: visible, note: DECISION_DISCLAIMER };
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
