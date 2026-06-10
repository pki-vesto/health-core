// Integrity checks over the Core (goal 14). Pure reads; returns a structured
// report. Each check is {name, ok, detail, count?}. `ok:false` means a real
// data-quality problem worth surfacing on the health dashboard / alerts.

// Plausibility bounds per metric (catches unit slips like kg↔g). Metrics not
// listed are only checked for non-negativity where value_kind implies it.
const BOUNDS = {
  'body.weight': { min: 30, max: 300 },          // kg
  'nutrition.calories': { min: 0, max: 20000 },  // kcal/day
  'nutrition.protein': { min: 0, max: 1000 },    // g/day
  'nutrition.carbs': { min: 0, max: 2000 },      // g/day
  'nutrition.fat': { min: 0, max: 1000 },        // g/day
  'fitness.session_volume': { min: 0, max: 1_000_000 } // kg/day
};

export function runIntegrity(db) {
  const checks = [];
  const add = (name, ok, detail, extra = {}) => checks.push({ name, ok, detail, ...extra });

  // 1. No observation points at a metric_type missing from the catalog.
  const orphans = db.prepare(
    `SELECT DISTINCT o.metric_type FROM observations o
       LEFT JOIN metric_types m ON m.key = o.metric_type
      WHERE m.key IS NULL`
  ).all().map(r => r.metric_type);
  add('no_orphan_metric_types', orphans.length === 0,
    orphans.length ? `orphans: ${orphans.join(', ')}` : 'all metric_types in catalog', { count: orphans.length });

  // 2. No observation referencing an unknown source id.
  const badSrc = db.prepare(
    `SELECT COUNT(*) AS n FROM observations o
       LEFT JOIN sources s ON s.id = o.source WHERE s.id IS NULL`
  ).get().n;
  add('no_unknown_sources', badSrc === 0, badSrc ? `${badSrc} rows with unknown source` : 'all sources resolve', { count: badSrc });

  // 3. UNIQUE(source, external_id, metric_type) holds (no logical dupes).
  const dups = db.prepare(
    `SELECT source, external_id, metric_type, COUNT(*) AS n
       FROM observations GROUP BY source, external_id, metric_type HAVING n > 1`
  ).all();
  add('no_duplicate_keys', dups.length === 0,
    dups.length ? `${dups.length} duplicated identity keys` : 'identity keys unique', { count: dups.length });

  // 4. No NULL/empty required fields.
  const nulls = db.prepare(
    `SELECT COUNT(*) AS n FROM observations
      WHERE value IS NULL OR timestamp IS NULL OR unit IS NULL OR unit = ''
         OR external_id IS NULL OR external_id = ''`
  ).get().n;
  add('no_null_required_fields', nulls === 0, nulls ? `${nulls} rows with null/empty required fields` : 'required fields populated', { count: nulls });

  // 5. Observation unit matches the metric_type's declared unit.
  const unitMismatch = db.prepare(
    `SELECT o.metric_type, o.unit AS obs_unit, m.unit AS catalog_unit, COUNT(*) AS n
       FROM observations o JOIN metric_types m ON m.key = o.metric_type
      WHERE o.unit <> m.unit GROUP BY o.metric_type, o.unit`
  ).all();
  add('units_consistent', unitMismatch.length === 0,
    unitMismatch.length ? unitMismatch.map(u => `${u.metric_type}: ${u.obs_unit}≠${u.catalog_unit}(${u.n})`).join('; ') : 'observation units match catalog',
    { count: unitMismatch.reduce((a, u) => a + u.n, 0) });

  // 6. Timestamps look like dates and are not in the future.
  const todayUtc = db.prepare("SELECT date('now') AS d").get().d;
  // NB: SQLite GLOB treats '_' as a literal (only '*' and '?' are wildcards) —
  // use digit character classes to assert a real YYYY-MM-DD shape.
  const badDates = db.prepare(
    `SELECT COUNT(*) AS n FROM observations
      WHERE timestamp NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
         OR timestamp > @today`
  ).get({ today: todayUtc }).n;
  add('timestamps_valid', badDates === 0, badDates ? `${badDates} malformed/future timestamps` : 'timestamps well-formed and not future-dated', { count: badDates });

  // 7. Plausibility bounds per metric.
  let implausible = 0;
  const offenders = [];
  for (const [metric, b] of Object.entries(BOUNDS)) {
    const r = db.prepare(
      'SELECT COUNT(*) AS n, MIN(value) AS mn, MAX(value) AS mx FROM observations WHERE metric_type = ? AND (value < ? OR value > ?)'
    ).get(metric, b.min, b.max);
    if (r.n > 0) { implausible += r.n; offenders.push(`${metric}:${r.n}(min ${r.mn},max ${r.mx})`); }
  }
  add('values_within_bounds', implausible === 0,
    implausible ? `out of bounds → ${offenders.join('; ')}` : 'all values within plausibility bounds', { count: implausible });

  const ok = checks.every(c => c.ok);
  return { ok, passed: checks.filter(c => c.ok).length, failed: checks.filter(c => !c.ok).length, checks };
}
