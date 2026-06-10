// Auto Health Export (Apple Health) → canonical observation records.
//
// Auto Health Export posts JSON shaped like:
//   { "data": { "metrics": [ { "name":"step_count","units":"count",
//       "data":[ {"date":"2026-06-01 00:00:00 +0000","qty":8421}, ... ] }, ... ] } }
// We map known metric names to Core metric_types, aggregate to one value per
// calendar day, and emit generic records for the ingest layer to validate +
// upsert (idempotent, LWW). Unknown metric names are skipped (reported), not
// quarantined — they're simply vocabulary we don't track yet (additive-only).
//
// Idempotency/corrections: source_updated_at = the latest sample datetime within
// the day. Re-posting identical samples → same stamp → no-op. A corrected export
// that adds/changes samples (new sample times) → newer stamp → LWW updates.

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Canonical Auto Health Export metric `name` → Core metric, daily aggregation,
// and expected unit. Names below are the snake_case identifiers Auto Health
// Export uses in its JSON `data.metrics[].name`.
const MAP = {
  resting_heart_rate:     { metric: 'heart.resting_rate', agg: 'avg',   unit: 'bpm' },
  heart_rate_variability: { metric: 'heart.hrv_sdnn',     agg: 'avg',   unit: 'ms' },
  vo2_max:                { metric: 'fitness.vo2max',     agg: 'avg',   unit: 'ml/kg/min' },
  step_count:             { metric: 'activity.steps',     agg: 'sum',   unit: 'count' },
  sleep_analysis:         { metric: 'sleep.duration',     agg: 'sleep', unit: 'h' }
};

// Alias → canonical MAP key. Names are matched after lowercasing the export's
// metric name, so both case and separator variants resolve here.
//   • <name>nounderscores  → handles camelCase exports (stepCount → stepcount)
//   • known synonyms       → HRV/SDNN spellings, vo2 short form, etc.
// WHEN VERIFYING A REAL EXPORT (task #5): if a real device names a metric
// differently than expected, add the exact lowercased name here pointing at the
// canonical MAP key — never invent a new MAP entry for the same Core metric.
const ALIAS = {
  // separator-free forms (camelCase / spaced exports normalise to these)
  restingheartrate:            'resting_heart_rate',
  heartratevariability:        'heart_rate_variability',
  stepcount:                   'step_count',
  sleepanalysis:               'sleep_analysis',
  vo2max:                      'vo2_max',
  // common synonyms across Auto Health Export / other Health exporters
  hrv:                         'heart_rate_variability',
  hrv_sdnn:                    'heart_rate_variability',
  heart_rate_variability_sdnn: 'heart_rate_variability',
  steps:                       'step_count',
  vo2:                         'vo2_max',
  sleep:                       'sleep_analysis'
};

function appleDateToParts(s) {
  // "2026-06-01 07:30:00 +0000" | "2026-06-01" | ISO. Returns {date, iso} or null.
  const str = String(s || '').trim();
  const m = str.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?\s*([+-]\d{2}:?\d{2}|Z)?/);
  if (!m) { const d = new Date(str); return isNaN(d) ? null : { date: d.toISOString().slice(0, 10), iso: d.toISOString() }; }
  const date = m[1];
  const time = m[2] || '00:00:00';
  let off = m[3] || 'Z';
  if (off !== 'Z' && !off.includes(':')) off = off.slice(0, 3) + ':' + off.slice(3); // +0000 → +00:00
  const d = new Date(`${date}T${time}${off}`);
  return isNaN(d) ? { date, iso: `${date}T00:00:00.000Z` } : { date, iso: d.toISOString() };
}

function sleepHours(item) {
  // Newer exports: {asleep} or {totalSleep} in hours; older: {qty}/{value}.
  const direct = item.asleep ?? item.totalSleep ?? item.total_sleep ?? item.value ?? item.qty;
  if (direct != null && Number.isFinite(Number(direct))) return Number(direct);
  // Newest schema splits the night into stage durations (hours). Sum the asleep
  // stages (deep+rem+core/light) when no single total is present; ignore inBed
  // and awake so the total reflects time actually asleep.
  const stages = ['deep', 'rem', 'core', 'light'].map(k => Number(item[k])).filter(Number.isFinite);
  return stages.length ? stages.reduce((a, b) => a + b, 0) : NaN;
}

// Returns { records, skipped:[{name,count}], mappedMetrics:[...] }.
export function mapAppleHealth(payload) {
  const metrics = payload?.data?.metrics;
  if (!Array.isArray(metrics)) { const e = new Error('payload.data.metrics must be an array'); e.status = 400; throw e; }

  // bucket[coreMetric][date] = { vals:[], sum:0, maxIso:'', unit, name }
  const bucket = new Map();
  const skipped = [];
  const mapped = new Set();

  for (const m of metrics) {
    const rawName = String(m?.name || '').toLowerCase();
    const name = MAP[rawName] ? rawName : (ALIAS[rawName] || rawName);
    const spec = MAP[name];
    if (!spec) { skipped.push({ name: m?.name, count: Array.isArray(m?.data) ? m.data.length : 0 }); continue; }
    mapped.add(spec.metric);

    for (const pt of (m.data || [])) {
      const when = appleDateToParts(pt.date);
      if (!when) continue;
      const val = spec.agg === 'sleep' ? sleepHours(pt) : Number(pt.qty ?? pt.value);
      if (!Number.isFinite(val)) continue;

      if (!bucket.has(spec.metric)) bucket.set(spec.metric, new Map());
      const byDate = bucket.get(spec.metric);
      const cur = byDate.get(when.date) || { vals: [], sum: 0, maxIso: '', unit: spec.unit, agg: spec.agg, apple: name };
      cur.vals.push(val); cur.sum += val;
      if (when.iso > cur.maxIso) cur.maxIso = when.iso;
      byDate.set(when.date, cur);
    }
  }

  const records = [];
  for (const [metric, byDate] of bucket) {
    for (const [date, c] of byDate) {
      let value;
      if (c.agg === 'avg') value = c.vals.reduce((a, b) => a + b, 0) / c.vals.length;
      else value = c.sum; // sum + sleep
      records.push({
        metric_type: metric,
        value: round2(value),
        unit: c.unit,
        timestamp: date,
        external_id: `apple:${metric}:${date}`,
        source_updated_at: c.maxIso || `${date}T00:00:00.000Z`,
        metadata: { derived_from: 'apple_health', apple_metric: c.apple, aggregation_window: 'day', agg: c.agg, samples: c.vals.length }
      });
    }
  }
  return { records, skipped, mappedMetrics: [...mapped] };
}
