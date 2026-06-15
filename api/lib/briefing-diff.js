// Pure diff between two assembled briefings. Returns added/removed/changed
// arrays for the briefing's three list-shaped surfaces (highlights, alerts,
// decisions) plus a summary delta. The first-ever snapshot has no prior — the
// caller signals that by passing prev = null and we return { first: true }
// instead of attempting a diff.
//
// Keying:
//   highlights — keyed by `metric` (intelligence.dashboard cards each carry
//                their metric_type, that is the stable identity)
//   alerts     — keyed by `type` (anomaly/stress alert taxonomy)
//   decisions  — keyed by `type + message` (decisionSupport recommendations
//                share a type but the message disambiguates which biomarker
//                triggered it)
// `changed` lists items where the key matches but a tracked field differs;
// for highlights we compare `latest.value` and `trend.direction`; for alerts
// we compare `severity` and `score`; for decisions we compare `priority` and
// `message`.

export function diffBriefings(prev, next) {
  if (next == null) return { first: true, empty: true };
  if (prev == null) {
    return {
      first: true,
      next: { period: next.period, generated_at: next.generated_at }
    };
  }
  return {
    first: false,
    prev: { period: prev.period, generated_at: prev.generated_at },
    next: { period: next.period, generated_at: next.generated_at },
    summary: diffSummary(prev.summary, next.summary),
    highlights: diffList(prev.highlights, next.highlights, highlightKey, highlightFields),
    alerts: diffList(prev.alerts, next.alerts, alertKey, alertFields),
    decisions: diffList(prev.decisions, next.decisions, decisionKey, decisionFields)
  };
}

function diffList(prevList, nextList, keyFn, fieldsFn) {
  const a = Array.isArray(prevList) ? prevList : [];
  const b = Array.isArray(nextList) ? nextList : [];
  const am = new Map(a.map(x => [keyFn(x), x]));
  const bm = new Map(b.map(x => [keyFn(x), x]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [k, v] of bm) if (!am.has(k)) added.push(v);
  for (const [k, v] of am) if (!bm.has(k)) removed.push(v);
  for (const [k, v] of bm) {
    if (!am.has(k)) continue;
    const before = fieldsFn(am.get(k));
    const after = fieldsFn(v);
    if (!shallowEqual(before, after)) changed.push({ key: k, before, after });
  }
  return { added, removed, changed };
}

function diffSummary(prev, next) {
  if (prev == null && next == null) return { changed: [] };
  const a = isObj(prev) ? prev : {};
  const b = isObj(next) ? next : {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed = [];
  for (const k of keys) {
    if (!shallowEqual(a[k], b[k])) changed.push({ key: k, before: a[k] ?? null, after: b[k] ?? null });
  }
  return { changed };
}

function highlightKey(h) { return h?.metric ?? JSON.stringify(h); }
function highlightFields(h) {
  return {
    latest_value: h?.latest?.value ?? null,
    trend_direction: h?.trend?.direction ?? null
  };
}

function alertKey(a) { return a?.type ?? JSON.stringify(a); }
function alertFields(a) {
  return { severity: a?.severity ?? null, score: a?.score ?? null };
}

function decisionKey(d) { return `${d?.type ?? ''}|${d?.message ?? ''}`; }
function decisionFields(d) {
  return { priority: d?.priority ?? null, message: d?.message ?? null };
}

function isObj(x) { return x != null && typeof x === 'object' && !Array.isArray(x); }
function shallowEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}
