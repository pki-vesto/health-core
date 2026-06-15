import { referenceFor } from './health-os.js';

const RECORD_CONFIGS = [
  { metric: 'body.weight', direction: 'min', category: 'record_low', label: 'laagste gewicht' },
  { metric: 'fitness.session_volume', direction: 'max', category: 'record_high', label: 'hoogste trainingsvolume' },
  { metric: 'fitness.vo2max', direction: 'max', category: 'record_high', label: 'hoogste VO2max' }
];

const STREAK_METRICS = ['body.weight', 'mood.valence', 'sleep.duration'];

export function listMilestones(db, { limit = 50 } = {}) {
  const n = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
  return db.prepare('SELECT * FROM health_milestones ORDER BY timestamp DESC, id DESC LIMIT ?').all(n);
}

export function detectMilestones(db, write = db, opts = {}) {
  const detected = [
    ...recordMilestones(db),
    ...biomarkerRangeMilestones(db, opts),
    ...streakMilestones(db)
  ];
  let written = 0;
  for (const m of detected) written += insertMilestone(write, m);
  return { detected: detected.length, written, milestones: detected };
}

function insertMilestone(db, m) {
  const exists = db.prepare(
    `SELECT 1 FROM health_milestones
      WHERE category = ? AND metric_type IS ? AND timestamp = ? AND title = ?
      LIMIT 1`
  ).get(m.category, m.metric_type ?? null, m.timestamp, m.title);
  if (exists) return 0;
  return db.prepare(
    `INSERT INTO health_milestones (timestamp, category, title, detail, metric_type, value)
     VALUES (@timestamp, @category, @title, @detail, @metric_type, @value)`
  ).run({ ...m, metric_type: m.metric_type ?? null, value: m.value ?? null }).changes;
}

function recordMilestones(db) {
  const out = [];
  for (const cfg of RECORD_CONFIGS) {
    const rows = db.prepare(
      `SELECT timestamp, metric_type, value, unit
         FROM observations
        WHERE metric_type = ?
        ORDER BY timestamp ASC, updated_at ASC`
    ).all(cfg.metric);
    let best = null;
    for (const r of rows) {
      const beats = best != null && (cfg.direction === 'min' ? r.value < best : r.value > best);
      if (beats) out.push(recordMilestone(cfg, r));
      if (best == null || (cfg.direction === 'min' ? r.value < best : r.value > best)) best = r.value;
    }
  }
  return out;
}

function recordMilestone(cfg, row) {
  const value = fmt(row.value);
  const unit = row.unit ? ` ${row.unit}` : '';
  return {
    timestamp: row.timestamp,
    category: cfg.category,
    title: `Nieuw ${cfg.label}`,
    detail: `${value}${unit} op ${row.timestamp}.`,
    metric_type: row.metric_type,
    value: row.value
  };
}

function biomarkerRangeMilestones(db, opts = {}) {
  const rows = db.prepare(
    `SELECT o.timestamp, o.metric_type, o.value, o.unit
       FROM observations o
       JOIN biomarker_registry b ON b.metric_key = o.metric_type
      ORDER BY o.metric_type ASC, o.timestamp ASC, o.updated_at ASC`
  ).all();
  const byMetric = groupBy(rows, (r) => r.metric_type);
  const out = [];
  for (const [metric, metricRows] of byMetric) {
    const ref = referenceFor(db, metric, opts);
    if (!ref) continue;
    let previousInside = null;
    for (const r of metricRows) {
      const inside = inRange(r.value, ref);
      if (previousInside === false && inside) out.push(rangeMilestone(r, ref));
      previousInside = inside;
    }
  }
  return out;
}

function rangeMilestone(row, ref) {
  const value = fmt(row.value);
  const unit = row.unit ? ` ${row.unit}` : '';
  const low = ref.optimal_low ?? ref.low;
  const high = ref.optimal_high ?? ref.high;
  return {
    timestamp: row.timestamp,
    category: 'biomarker_in_range',
    title: `${humanMetric(row.metric_type)} terug in bereik`,
    detail: `${value}${unit} valt weer binnen ${fmt(low)}-${fmt(high)} ${ref.unit}.`,
    metric_type: row.metric_type,
    value: row.value
  };
}

function streakMilestones(db) {
  const out = [];
  for (const metric of STREAK_METRICS) {
    const rows = db.prepare(
      `SELECT DISTINCT timestamp, metric_type
         FROM observations
        WHERE metric_type = ?
        ORDER BY timestamp ASC`
    ).all(metric);
    let streak = 0;
    let prev = null;
    for (const r of rows) {
      streak = prev && dateAdd(prev, 1) === r.timestamp ? streak + 1 : 1;
      if (streak === 7) {
        out.push({
          timestamp: r.timestamp,
          category: 'logging_streak',
          title: `7 dagen ${humanMetric(metric)} gelogd`,
          detail: `Eerste 7-daagse reeks eindigt op ${r.timestamp}.`,
          metric_type: metric,
          value: 7
        });
        break;
      }
      prev = r.timestamp;
    }
  }
  return out;
}

function inRange(value, ref) {
  const low = ref.optimal_low ?? ref.low;
  const high = ref.optimal_high ?? ref.high;
  return value >= low && value <= high;
}

function humanMetric(key) {
  const map = {
    'body.weight': 'gewicht',
    'fitness.session_volume': 'trainingsvolume',
    'fitness.vo2max': 'VO2max',
    'mood.valence': 'mood',
    'sleep.duration': 'slaap',
    'blood.apob': 'ApoB',
    'blood.glucose': 'glucose',
    'blood.crp': 'CRP'
  };
  return map[key] || key.replace(/[._]/g, ' ');
}

function groupBy(rows, fn) {
  const out = new Map();
  for (const row of rows) {
    const key = fn(row);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  }
  return out;
}

function dateAdd(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmt(n) {
  return Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
}
