// Auth-on smoke test (task #16). Run against a server started WITH
// CORE_BEARER_TOKEN set; pass the same token here:
//   BASE=http://localhost:8098 CORE_BEARER_TOKEN=secret node test/auth.test.mjs
// Verifies the data API is bearer-gated while health + UI stay open.
const BASE = process.env.BASE || 'http://localhost:8090';
const TOKEN = process.env.CORE_BEARER_TOKEN || '';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.error(`  ✗ ${n}${d ? ' — ' + d : ''}`));
async function status(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const r = await fetch(BASE + path, { headers });
  return r.status;
}

console.log(`Auth-on smoke → ${BASE}`);
if (!TOKEN) { console.error('  ✗ CORE_BEARER_TOKEN not provided to the test'); process.exit(1); }

// Open endpoints (no token required) — uptime probes + UI shell.
ok('GET /api/health open without token', await status('/api/health') === 200);
ok('GET / (UI) open without token', await status('/') === 200);

// Data API is gated.
ok('GET /api/v1/metrics without token → 401', await status('/api/v1/metrics') === 401);
ok('GET /api/v1/metrics with WRONG token → 401', await status('/api/v1/metrics', 'not-the-token') === 401);
ok('GET /api/v1/metrics with correct token → 200', await status('/api/v1/metrics', TOKEN) === 200);
ok('GET /api/v1/observations with correct token → 200', await status('/api/v1/observations?limit=1', TOKEN) === 200);
ok('GET /api/v1/export/observations without token → 401', await status('/api/v1/export/observations') === 401);
ok('GET /api/v1/export/observations with correct token → 200', await status('/api/v1/export/observations', TOKEN) === 200);
ok('GET /api/v1/export/observations.json with correct token → 200', await status('/api/v1/export/observations.json', TOKEN) === 200);
ok('GET /api/v1/dashboard with correct token → 200', await status('/api/v1/dashboard', TOKEN) === 200);

// Write/ingest surface is gated too (it lives under /api/v1).
{
  const r = await fetch(BASE + '/api/v1/lab/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  ok('POST /api/v1/lab/parse without token → 401', r.status === 401, `got ${r.status}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
