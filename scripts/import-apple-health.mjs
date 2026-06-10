// Real Auto Health Export importer + dry-run verifier (task #5).
//
// Auto Health Export (iOS) posts/saves JSON shaped like:
//   { "data": { "metrics": [ { "name": "...", "units": "...", "data": [...] } ] } }
//
// This CLI runs a real export file through the SAME mapper the ingest endpoint
// uses (api/lib/apple-health.js), so what you see in the dry-run is exactly what
// would be written. It needs only Node (global fetch for --post); no native deps.
//
// USAGE
//   # Dry-run: map a real export and report what would land + unknown names
//   node scripts/import-apple-health.mjs path/to/export.json
//
//   # Import: POST the export to the running Core ingest endpoint
//   node scripts/import-apple-health.mjs path/to/export.json --post http://localhost:8091
//   #   add --token <CORE_BEARER_TOKEN> if the API has bearer auth enabled
//
//   # Verify after import: re-query /api/v1/stats for the mapped metrics
//   node scripts/import-apple-health.mjs path/to/export.json --post http://localhost:8091 --verify
//
// IF UNKNOWN NAMES APPEAR: the dry-run lists every export metric name we don't
// map yet. Add the exact (lowercased) name to ALIAS in api/lib/apple-health.js
// pointing at the right canonical MAP key (task #6), then re-run.
import { readFileSync } from 'node:fs';
import { mapAppleHealth } from '../api/lib/apple-health.js';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const POST = opt('--post');
const TOKEN = opt('--token');
const VERIFY = !!opt('--verify');

if (!file) {
  console.error('usage: node scripts/import-apple-health.mjs <export.json> [--post <baseurl>] [--token <t>] [--verify]');
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ cannot read/parse ${file}: ${e.message}`);
  process.exit(2);
}

// ── Dry-run mapping report ───────────────────────────────────────────────────
let mapped;
try {
  mapped = mapAppleHealth(payload);
} catch (e) {
  console.error(`✗ mapper rejected payload: ${e.message}`);
  console.error('  (expected shape: { data: { metrics: [ { name, units, data:[...] } ] } })');
  process.exit(1);
}

const byMetric = new Map();
for (const r of mapped.records) {
  const g = byMetric.get(r.metric_type) || { n: 0, first: r.timestamp, last: r.timestamp };
  g.n++; g.first = r.timestamp < g.first ? r.timestamp : g.first; g.last = r.timestamp > g.last ? r.timestamp : g.last;
  byMetric.set(r.metric_type, g);
}

console.log(`=== Auto Health Export dry-run: ${file} ===`);
console.log(`mapped ${mapped.records.length} daily record(s) across ${byMetric.size} metric(s):`);
for (const [metric, g] of [...byMetric].sort()) console.log(`  • ${metric.padEnd(22)} ${String(g.n).padStart(4)} days  ${g.first} → ${g.last}`);

if (mapped.skipped.length) {
  console.log(`\nUNMAPPED export names (${mapped.skipped.length}) — add to ALIAS in api/lib/apple-health.js if any is a metric we track:`);
  for (const s of mapped.skipped) console.log(`  · ${s.name}  (${s.count} points)`);
} else {
  console.log('\nno unmapped metric names — every export metric resolved.');
}

// Surface sample records so field-name assumptions can be eyeballed against the
// real export before committing (task #5 verification).
console.log('\nsample records (first 3):');
for (const r of mapped.records.slice(0, 3)) console.log('  ' + JSON.stringify(r));

if (!POST) {
  console.log('\n(dry-run only — pass --post <baseurl> to import)');
  process.exit(0);
}

// ── Import via the ingest endpoint ───────────────────────────────────────────
const base = String(POST).replace(/\/$/, '');
const headers = { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) };

console.log(`\n=== POST ${base}/api/v1/ingest/apple-health ===`);
const res = await fetch(`${base}/api/v1/ingest/apple-health`, { method: 'POST', headers, body: JSON.stringify(payload) });
const out = await res.json().catch(() => ({}));
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(out, null, 2));

if (VERIFY) {
  console.log('\n=== verify: GET /api/v1/stats (mapped metrics) ===');
  const statsRes = await fetch(`${base}/api/v1/stats`, { headers });
  const stats = await statsRes.json().catch(() => ({ stats: [] }));
  const wanted = new Set(byMetric.keys());
  for (const s of (stats.stats || []).filter(s => wanted.has(s.metric_type))) {
    console.log(`  • ${s.metric_type.padEnd(22)} count ${String(s.count).padStart(5)}  ${s.first} → ${s.last}`);
  }
}

process.exit(res.ok ? 0 : 1);
