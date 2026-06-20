import { BadRequest, isDate, metricExists } from './query.js';

export const EXPERIMENT_STATUSES = ['planned', 'active', 'concluded', 'abandoned'];

class NotFound extends Error {
  constructor(msg) { super(msg); this.status = 404; }
}

const TEXT_MAX = 1000;
const DEFAULT_DESIGN = 'single-user baseline/test window';

export function listExperiments(database) {
  return database.prepare(`
    SELECT id, hypothesis, intervention, reversible, design, metric_type,
           baseline_start, baseline_end, test_start, test_end, status, result
      FROM experiments
     ORDER BY id DESC
  `).all().map(normalizeRow);
}

export function createExperiment(database, body = {}) {
  const row = validateCreate(database, body);
  const info = database.prepare(`
    INSERT INTO experiments
      (hypothesis, intervention, reversible, design, metric_type,
       baseline_start, baseline_end, test_start, test_end, status, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', NULL)
  `).run(
    row.hypothesis, row.intervention, row.reversible, row.design, row.metric_type,
    row.baseline_start, row.baseline_end, row.test_start, row.test_end
  );
  return getExperiment(database, Number(info.lastInsertRowid));
}

export function setStatus(database, id, status) {
  const parsedId = parseId(id);
  const next = parseStatus(status);
  const existing = getExperiment(database, parsedId);
  database.prepare('UPDATE experiments SET status = ? WHERE id = ?').run(next, parsedId);
  return { ...existing, status: next };
}

export function analyze(readDatabase, writeDatabase, id) {
  const experiment = getExperiment(readDatabase, parseId(id));
  const result = analysisFor(readDatabase, experiment);
  writeDatabase.prepare('UPDATE experiments SET result = ? WHERE id = ?')
    .run(JSON.stringify(result), experiment.id);
  return { experiment: { ...experiment, result }, result };
}

export function getExperiment(database, id) {
  const row = database.prepare(`
    SELECT id, hypothesis, intervention, reversible, design, metric_type,
           baseline_start, baseline_end, test_start, test_end, status, result
      FROM experiments
     WHERE id = ?
  `).get(parseId(id));
  if (!row) throw new NotFound(`experiment ${id} not found`);
  return normalizeRow(row);
}

export function parseId(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new BadRequest('id must be a positive integer');
  return n;
}

export function parseStatus(raw) {
  const s = String(raw || '').trim();
  if (!EXPERIMENT_STATUSES.includes(s)) {
    throw new BadRequest(`status must be one of ${EXPERIMENT_STATUSES.join(', ')}`);
  }
  return s;
}

function validateCreate(database, body) {
  const hypothesis = text(body.hypothesis, 'hypothesis');
  const intervention = text(body.intervention, 'intervention');
  const metric_type = text(body.metric_type, 'metric_type', { max: 200 });
  if (!metricExists(database, metric_type)) throw new BadRequest(`unknown metric '${metric_type}'`);

  const baseline_start = validDate(body.baseline_start, 'baseline_start');
  const baseline_end = validDate(body.baseline_end, 'baseline_end');
  const test_start = validDate(body.test_start, 'test_start');
  const test_end = validDate(body.test_end, 'test_end');
  if (baseline_start > baseline_end) throw new BadRequest('baseline_start must be <= baseline_end');
  if (test_start > test_end) throw new BadRequest('test_start must be <= test_end');

  return {
    hypothesis,
    intervention,
    metric_type,
    baseline_start,
    baseline_end,
    test_start,
    test_end,
    reversible: body.reversible ? 1 : 0,
    design: body.design == null || body.design === '' ? DEFAULT_DESIGN : text(body.design, 'design', { max: 200 })
  };
}

function analysisFor(database, experiment) {
  const baseline = windowStats(database, experiment.metric_type, experiment.baseline_start, experiment.baseline_end);
  const test = windowStats(database, experiment.metric_type, experiment.test_start, experiment.test_end);
  const base = {
    status: 'insufficient',
    metric_type: experiment.metric_type,
    baseline: stripValues(baseline),
    test: stripValues(test),
    delta: null,
    percent_delta: null,
    direction: 'unknown',
    confidence: 'insufficient',
    verdict: 'insufficient data',
    reason: null
  };
  if (baseline.n < 3 || test.n < 3) {
    return {
      ...base,
      reason: `need at least 3 observations in each window (baseline=${baseline.n}, test=${test.n})`
    };
  }

  const delta = round4(test.mean - baseline.mean);
  const percent = baseline.mean === 0 ? null : round4((delta / baseline.mean) * 100);
  const pooled = pooledStddev(baseline.values, test.values);
  const effect = pooled ? Math.abs(delta) / pooled : (delta === 0 ? 0 : Infinity);
  return {
    ...base,
    status: 'sufficient',
    delta,
    percent_delta: percent,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    confidence: confidenceFor(baseline.n, test.n, effect),
    verdict: verdictFor(delta, effect),
    reason: null,
    baseline: stripValues(baseline),
    test: stripValues(test),
    effect_size: Number.isFinite(effect) ? round4(effect) : null
  };
}

function windowStats(database, metric, from, to) {
  const rows = database.prepare(`
    SELECT timestamp, AVG(value) AS value
      FROM observations
     WHERE metric_type = ? AND timestamp BETWEEN ? AND ?
     GROUP BY timestamp
     ORDER BY timestamp
  `).all(metric, from, to);
  const values = rows.map(r => Number(r.value)).filter(Number.isFinite);
  return {
    from,
    to,
    n: values.length,
    mean: values.length ? round4(mean(values)) : null,
    values
  };
}

function stripValues(stats) {
  const { values: _values, ...out } = stats;
  return out;
}

function pooledStddev(a, b) {
  const values = [...a, ...b];
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function confidenceFor(n1, n2, effect) {
  const n = Math.min(n1, n2);
  if (n < 3) return 'insufficient';
  if (n >= 14 && effect >= 0.8) return 'high';
  if (n >= 7 && effect >= 0.5) return 'medium';
  return 'low';
}

function verdictFor(delta, effect) {
  if (delta === 0) return 'no observed change';
  if (effect < 0.2) return 'small observed change';
  return delta > 0 ? 'test window higher than baseline' : 'test window lower than baseline';
}

function normalizeRow(row) {
  return {
    ...row,
    reversible: row.reversible ? 1 : 0,
    result: parseResult(row.result)
  };
}

function parseResult(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return raw; }
}

function validDate(raw, field) {
  if (typeof raw !== 'string' || !isDate(raw)) throw new BadRequest(`${field} must be YYYY-MM-DD`);
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new BadRequest(`${field} is not a real calendar date`);
  }
  return raw;
}

function text(raw, field, { max = TEXT_MAX } = {}) {
  if (typeof raw !== 'string') throw new BadRequest(`${field} is required`);
  const s = raw.trim();
  if (!s) throw new BadRequest(`${field} is required`);
  if (s.length > max) throw new BadRequest(`${field} exceeds ${max} chars`);
  return s;
}

function mean(values) {
  return values.reduce((s, x) => s + x, 0) / values.length;
}

function round4(x) {
  return x == null ? null : Math.round(Number(x) * 10000) / 10000;
}
