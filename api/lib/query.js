// Read-only query helpers over the Core observations time-series.
// Every query is parameterised; user input is validated/clamped before it
// reaches SQL. No string interpolation of values into SQL.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AGGS = new Set(['avg', 'sum', 'min', 'max', 'count']);
const BUCKETS = new Set(['day', 'week', 'month']);
export const EXPORT_JSON_MAX = 10000;

export function isDate(s) {
  return typeof s === 'string' && DATE_RE.test(s);
}

export class BadRequest extends Error {
  constructor(msg) { super(msg); this.status = 400; }
}
export class PayloadTooLarge extends Error {
  constructor(msg) { super(msg); this.status = 413; }
}

// ── Source precedence (multi-source same-day conflict policy) ─────────────────
// When >1 source reports the SAME metric on the SAME calendar day, the more
// authoritative source wins, regardless of which wrote last:
//   manual  (user correction)  >  lab (clinical)  >  apple_health (device)
//   >  shred (derived module)  >  health_core (internal)  >  unknown.
// Recency (last-write-wins) only breaks ties WITHIN the same source/rank. Note
// this applies after the latest calendar day is selected — a stale high-trust
// value never overrides a fresher day from another source. See docs/DECISIONS.md.
export const SOURCE_PRECEDENCE = ['manual', 'lab', 'apple_health', 'shred', 'health_core'];

export function sourceRank(name) {
  const i = SOURCE_PRECEDENCE.indexOf(name);
  return i === -1 ? SOURCE_PRECEDENCE.length : i;
}

// True if row `a` should be preferred over `b` as the authoritative value for a
// given metric+day. Rows need { source, source_updated_at?, updated_at? }.
export function preferLatest(a, b) {
  const ra = sourceRank(a.source), rb = sourceRank(b.source);
  if (ra !== rb) return ra < rb;                       // higher trust first
  const sa = a.source_updated_at || '', sb = b.source_updated_at || '';
  if (sa !== sb) return sa > sb;                        // then newer source stamp (LWW)
  return (a.updated_at || '') > (b.updated_at || '');   // then newer write
}

// ── Catalog ──────────────────────────────────────────────────────────────────
export function listMetrics(db, { includeDeprecated = false } = {}) {
  const where = includeDeprecated ? '' : "WHERE status = 'active'";
  return db.prepare(
    `SELECT key, display_name, unit, value_kind, status, description
       FROM metric_types ${where} ORDER BY key`
  ).all();
}

export function metricExists(db, key) {
  return !!db.prepare('SELECT 1 FROM metric_types WHERE key = ?').get(key);
}

export function listSources(db) {
  return db.prepare('SELECT id, name, kind FROM sources ORDER BY id').all();
}

// ── Observations ─────────────────────────────────────────────────────────────
export function queryObservations(db, params = {}) {
  let limit = parseInt(params.limit ?? '500', 10);
  let offset = parseInt(params.offset ?? '0', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 500;
  limit = Math.min(limit, 5000);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  const { where, args } = observationFilter(db, params);

  const rows = db.prepare(
    `SELECT o.timestamp, o.metric_type, o.value, o.unit, s.name AS source,
            o.external_id, o.source_updated_at, o.metadata, o.updated_at
       FROM observations o JOIN sources s ON s.id = o.source
       ${where}
       ORDER BY o.timestamp DESC, o.metric_type
       LIMIT @limit OFFSET @offset`
  ).all({ ...args, limit, offset });

  const total = db.prepare(
    `SELECT COUNT(*) AS n FROM observations o JOIN sources s ON s.id = o.source ${where}`
  ).get(args).n;

  return {
    total, limit, offset,
    rows: rows.map(r => ({ ...r, metadata: safeJson(r.metadata) }))
  };
}

export function exportObservationCount(db, params = {}) {
  const { where, args } = observationFilter(db, params);
  return db.prepare(
    `SELECT COUNT(*) AS n FROM observations o JOIN sources s ON s.id = o.source ${where}`
  ).get(args).n;
}

export function exportObservations(db, params = {}) {
  const { where, args } = observationFilter(db, params);
  return db.prepare(
    `SELECT o.timestamp, o.metric_type, o.value, o.unit, s.name AS source,
            o.external_id, o.source_updated_at, o.metadata, o.updated_at
       FROM observations o JOIN sources s ON s.id = o.source
       ${where}
       ORDER BY o.timestamp ASC, o.metric_type ASC, s.name ASC, o.external_id ASC`
  ).iterate(args);
}

export function exportObservationsJson(db, params = {}) {
  const max = parseMax(params.max);
  const count = exportObservationCount(db, params);
  if (count > max) throw new PayloadTooLarge(`export too large for JSON form: ${count} rows exceeds max ${max}`);
  return {
    exported_at: new Date().toISOString(),
    count,
    observations: [...exportObservations(db, params)].map(exportRow)
  };
}

export function exportRow(row) {
  return { ...row, metadata: safeJson(row.metadata) };
}

// Latest observation per metric (Today Snapshot precursor). Optional metric
// filter (comma-separated) — otherwise every active metric.
export function latestPerMetric(db, { metrics } = {}) {
  let keys = null;
  if (metrics) {
    keys = String(metrics).split(',').map(s => s.trim()).filter(Boolean);
    for (const k of keys) if (!metricExists(db, k)) throw new BadRequest(`unknown metric '${k}'`);
  }
  const all = db.prepare(
    `SELECT o.metric_type, o.timestamp, o.value, o.unit, s.name AS source,
            o.source_updated_at, o.updated_at
       FROM observations o
       JOIN sources s ON s.id = o.source
       JOIN (SELECT metric_type, MAX(timestamp) AS mt
               FROM observations GROUP BY metric_type) latest
         ON latest.metric_type = o.metric_type AND latest.mt = o.timestamp
       ORDER BY o.metric_type`
  ).all();
  // A metric can have >1 row on its latest day (e.g. multiple sources); resolve
  // with the source-precedence policy (then LWW within a source) so the winner
  // is deterministic and trust-ordered, not iteration-order-dependent.
  const byMetric = new Map();
  for (const r of all) {
    const prev = byMetric.get(r.metric_type);
    if (!prev || preferLatest(r, prev)) byMetric.set(r.metric_type, r);
  }
  let out = [...byMetric.values()];
  if (keys) out = out.filter(r => keys.includes(r.metric_type));
  return out.sort((a, b) => a.metric_type.localeCompare(b.metric_type));
}

// ── Time series (for charts) ─────────────────────────────────────────────────
// bucket=day → raw daily points. week/month → period aggregate.
export function series(db, metric, params = {}) {
  if (!metricExists(db, metric)) throw new BadRequest(`unknown metric '${metric}'`);
  const bucket = params.bucket ?? 'day';
  const agg = params.agg ?? 'avg';
  if (!BUCKETS.has(bucket)) throw new BadRequest(`bucket must be one of ${[...BUCKETS].join(',')}`);
  if (!AGGS.has(agg)) throw new BadRequest(`agg must be one of ${[...AGGS].join(',')}`);

  const args = { metric };
  const clauses = ['metric_type = @metric'];
  if (params.from != null) { if (!isDate(params.from)) throw new BadRequest('from must be YYYY-MM-DD'); clauses.push('timestamp >= @from'); args.from = params.from; }
  if (params.to != null) { if (!isDate(params.to)) throw new BadRequest('to must be YYYY-MM-DD'); clauses.push('timestamp <= @to'); args.to = params.to; }
  const where = `WHERE ${clauses.join(' AND ')}`;

  let periodExpr;
  if (bucket === 'day') periodExpr = 'timestamp';
  else if (bucket === 'week') periodExpr = "date(timestamp, '-' || ((CAST(strftime('%w', timestamp) AS INTEGER) + 6) % 7) || ' days')"; // Monday of the week
  else periodExpr = "date(timestamp, 'start of month')";

  const aggSql = agg === 'count' ? 'COUNT(value)' : `${agg.toUpperCase()}(value)`;
  const unit = db.prepare('SELECT unit FROM metric_types WHERE key = ?').get(metric)?.unit ?? null;

  const rows = db.prepare(
    `SELECT ${periodExpr} AS period, ${aggSql} AS value, COUNT(*) AS n
       FROM observations ${where}
       GROUP BY period ORDER BY period ASC`
  ).all(args);

  return {
    metric, unit, bucket, agg,
    points: rows.map(r => ({ period: r.period, value: round4(r.value), n: r.n }))
  };
}

// ── Summary stats per metric ─────────────────────────────────────────────────
export function stats(db) {
  return db.prepare(
    `SELECT metric_type, COUNT(*) AS count,
            MIN(timestamp) AS first, MAX(timestamp) AS last,
            MIN(value) AS min, MAX(value) AS max, AVG(value) AS avg
       FROM observations GROUP BY metric_type ORDER BY metric_type`
  ).all().map(r => ({ ...r, avg: round4(r.avg) }));
}

function safeJson(s) { try { return s ? JSON.parse(s) : null; } catch { return s; } }
function round4(x) { return x == null ? null : Math.round(Number(x) * 1e4) / 1e4; }

function observationFilter(db, params = {}) {
  const { metric, from, to, source } = params;
  const clauses = [];
  const args = {};
  if (metric != null) {
    if (!metricExists(db, metric)) throw new BadRequest(`unknown metric '${metric}'`);
    clauses.push('o.metric_type = @metric'); args.metric = metric;
  }
  if (from != null) {
    if (!isDate(from)) throw new BadRequest('from must be YYYY-MM-DD');
    clauses.push('o.timestamp >= @from'); args.from = from;
  }
  if (to != null) {
    if (!isDate(to)) throw new BadRequest('to must be YYYY-MM-DD');
    clauses.push('o.timestamp <= @to'); args.to = to;
  }
  if (source != null) {
    clauses.push('s.name = @source'); args.source = source;
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args };
}

function parseMax(raw) {
  if (raw == null) return EXPORT_JSON_MAX;
  const max = parseInt(raw, 10);
  if (!Number.isFinite(max) || max < 1 || max > EXPORT_JSON_MAX) {
    throw new BadRequest(`max must be an integer from 1 to ${EXPORT_JSON_MAX}`);
  }
  return max;
}
