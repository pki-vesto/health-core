// Core API smoke + contract tests. Run against a live instance:
//   BASE=http://localhost:8090 node test/smoke.mjs
// Exits non-zero on any failure. Read-only: makes only GET requests.
const BASE = process.env.BASE || 'http://localhost:8090';
const TOKEN = process.env.CORE_BEARER_TOKEN || '';

let pass = 0, fail = 0;
const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}
async function get(path, withAuth = true) {
  const r = await fetch(BASE + path, { headers: withAuth ? headers : {} });
  let body = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}
async function getText(path) {
  const r = await fetch(BASE + path);
  return { status: r.status, text: await r.text() };
}
async function getRaw(path) {
  const r = await fetch(BASE + path, { headers });
  return { status: r.status, text: await r.text(), contentType: r.headers.get('content-type') || '' };
}

console.log(`Core API smoke tests → ${BASE}`);

// UI shell
{
  const { status, text } = await getText('/');
  ok('GET / → Health OS UI', status === 200 && text.includes('Personal Health Operating System'), `got ${status}`);
}

// Health (no auth)
{
  const { status, body } = await get('/api/health', false);
  ok('GET /api/health → 200', status === 200, `got ${status}`);
  ok('health.status ok', body?.status === 'ok', JSON.stringify(body));
  ok('health reports db.ok', body?.db?.ok === true);
  ok('health reports query_only enforced', body?.db?.query_only === true, 'connection must be read-only');
  ok('health has observation count', Number.isInteger(body?.db?.observations));
}

// Catalog
{
  const { status, body } = await get('/api/v1/metrics');
  ok('GET /api/v1/metrics → 200', status === 200, `got ${status}`);
  ok('metrics is non-empty array', Array.isArray(body?.metrics) && body.metrics.length >= 6);
  ok('metric has key+unit', body?.metrics?.[0]?.key && body?.metrics?.[0]?.unit);
}
{
  const { body } = await get('/api/v1/sources');
  ok('sources includes shred', body?.sources?.some(s => s.name === 'shred'));
}

// Observations
{
  const { status, body } = await get('/api/v1/observations?limit=5');
  ok('GET /api/v1/observations → 200', status === 200, `got ${status}`);
  ok('observations paginated shape', Number.isInteger(body?.total) && Array.isArray(body?.rows));
  ok('observations respects limit', body?.rows?.length <= 5);
  ok('observation row has metadata parsed', body?.rows?.length === 0 || typeof body.rows[0].metadata === 'object' || body.rows[0].metadata === null);
}
{
  const { status } = await get('/api/v1/observations?metric=does.not.exist');
  ok('unknown metric → 400', status === 400, `got ${status}`);
}
{
  const { status } = await get('/api/v1/observations?from=2026/01/01');
  ok('bad date → 400', status === 400, `got ${status}`);
}
{
  const { status, text, contentType } = await getRaw('/api/v1/export/observations?from=1900-01-01&to=1900-01-01');
  ok('GET /api/v1/export/observations → 200', status === 200, `got ${status}`);
  ok('NDJSON export content type', contentType.includes('application/x-ndjson'), contentType);
  ok('NDJSON export streams text', typeof text === 'string');
}
{
  const { status, body } = await get('/api/v1/export/observations.json?from=1900-01-01&to=1900-01-01');
  ok('GET /api/v1/export/observations.json → 200', status === 200, `got ${status}`);
  ok('JSON export shape', body?.exported_at && Number.isInteger(body?.count) && Array.isArray(body?.observations));
}

// Latest snapshot
{
  const { status, body } = await get('/api/v1/observations/latest');
  ok('GET /observations/latest → 200', status === 200, `got ${status}`);
  ok('latest is array', Array.isArray(body?.latest));
}

// Series
{
  const { status, body } = await get('/api/v1/series/body.weight?bucket=day');
  ok('GET /series/body.weight → 200', status === 200, `got ${status}`);
  ok('series has points', Array.isArray(body?.points));
  ok('series has unit kg', body?.unit === 'kg', `unit=${body?.unit}`);
}
{
  const { status } = await get('/api/v1/series/body.weight?bucket=decade');
  ok('bad bucket → 400', status === 400, `got ${status}`);
}
{
  const { body } = await get('/api/v1/series/nutrition.calories?bucket=week&agg=sum');
  ok('weekly sum series works', Array.isArray(body?.points) && body?.agg === 'sum');
}

// Stats + integrity
{
  const { status, body } = await get('/api/v1/stats');
  ok('GET /api/v1/stats → 200', status === 200, `got ${status}`);
  ok('stats per metric', Array.isArray(body?.stats) && body.stats.length >= 1);
}
{
  const { status, body } = await get('/api/v1/integrity');
  ok('GET /api/v1/integrity reachable', status === 200 || status === 409, `got ${status}`);
  ok('integrity has checks', Array.isArray(body?.checks) && body.checks.length >= 6);
  ok('integrity: data is clean (ok:true)', body?.ok === true, `failed: ${JSON.stringify(body?.checks?.filter(c => !c.ok))}`);
}

// Intelligence layer (goals 26-100)
{
  const { status, body } = await get('/api/v1/dashboard?days=30');
  ok('GET /api/v1/dashboard → 200', status === 200, `got ${status}`);
  ok('dashboard has cards and summary', Array.isArray(body?.cards) && body?.summary);
}
{
  const { status, body } = await get('/api/v1/training/summary');
  ok('GET /api/v1/training/summary → 200', status === 200, `got ${status}`);
  ok('training summary shape', body?.domain === 'training' && Array.isArray(body?.metrics));
}
{
  const { status, body } = await get('/api/v1/nutrition/summary');
  ok('GET /api/v1/nutrition/summary → 200', status === 200, `got ${status}`);
  ok('nutrition has macro balance', body?.macro_balance && Array.isArray(body?.metrics));
}
{
  const { status, body } = await get('/api/v1/recovery/summary');
  ok('GET /api/v1/recovery/summary → 200', status === 200, `got ${status}`);
  ok('recovery summary shape', body?.domain === 'recovery' && 'recovery_score' in body);
}
{
  const { status, body } = await get('/api/v1/correlations?days=90');
  ok('GET /api/v1/correlations → 200', status === 200, `got ${status}`);
  ok('correlations array', Array.isArray(body?.correlations));
}
{
  const { status, body } = await get('/api/v1/experiments/readiness');
  ok('GET /api/v1/experiments/readiness → 200', status === 200, `got ${status}`);
  ok('experiment readiness shape', Array.isArray(body?.experiments) && Array.isArray(body?.candidate_metrics));
}
{
  const { status, body } = await get('/api/v1/predictions');
  ok('GET /api/v1/predictions → 200', status === 200, `got ${status}`);
  ok('predictions array', Array.isArray(body?.predictions));
}
{
  const { status, body } = await get('/api/v1/product/status');
  ok('GET /api/v1/product/status → 200', status === 200, `got ${status}`);
  ok('product status reports goals 1-250', body?.goals?.completed === 250 && body?.goals?.total === 250);
}

// Supplied backlog after goal 100: biomarkers, bloodwork, stress, Health OS.
{
  const { status, body } = await get('/api/v1/biomarkers/registry');
  ok('GET /api/v1/biomarkers/registry → 200', status === 200, `got ${status}`);
  ok('biomarker registry populated', Array.isArray(body?.biomarkers) && body.biomarkers.length >= 10);
}
{
  const { status, body } = await get('/api/v1/biomarkers/ranges?metric=blood.apob');
  ok('GET /api/v1/biomarkers/ranges → 200', status === 200, `got ${status}`);
  ok('biomarker ranges shape', Array.isArray(body?.ranges));
}
{
  const { status, body } = await get('/api/v1/biomarkers/dashboard');
  ok('GET /api/v1/biomarkers/dashboard → 200', status === 200, `got ${status}`);
  ok('biomarker dashboard has scorecard', body?.scorecard && Array.isArray(body?.abnormal));
}
{
  const { status, body } = await get('/api/v1/bloodwork/overview');
  ok('GET /api/v1/bloodwork/overview → 200', status === 200, `got ${status}`);
  ok('bloodwork overview has panels', body?.cholesterol && body?.cardiometabolic_score);
}
{
  const { status, body } = await get('/api/v1/stress/summary');
  ok('GET /api/v1/stress/summary → 200', status === 200, `got ${status}`);
  ok('stress summary shape', body?.data_model && Array.isArray(body?.trends));
}
{
  const { status, body } = await get('/api/v1/briefing/daily');
  ok('GET /api/v1/briefing/daily → 200', status === 200, `got ${status}`);
  ok('daily briefing shape', body?.period === 'daily' && body?.summary);
}
{
  const { status, body } = await get('/api/v1/operating-system');
  ok('GET /api/v1/operating-system → 200', status === 200, `got ${status}`);
  ok('operating system status', body?.status === 'operational' && body?.decision_support);
}

// Full platform routes (goals 131-240)
for (const [path, check] of [
  ['/api/v1/platform/home', b => b?.brief && Array.isArray(b?.insights)],
  ['/api/v1/track/schema', b => Array.isArray(b?.forms) && Array.isArray(b?.metrics)],
  ['/api/v1/mood/dashboard', b => b?.range && Array.isArray(b?.trends)],
  ['/api/v1/wellbeing/trends', b => b?.range && Array.isArray(b?.trends)],
  ['/api/v1/symptoms/dashboard', b => b?.range && Array.isArray(b?.timelines)],
  ['/api/v1/body-composition/dashboard', b => b?.range && b?.recomposition],
  ['/api/v1/sleep/advanced', b => b?.range && 'sleep_debt' in b],
  ['/api/v1/nutrition/intelligence', b => b?.range && Array.isArray(b?.deficiencies)],
  ['/api/v1/recovery/intelligence', b => b?.range && Array.isArray(b?.warnings)],
  ['/api/v1/training/intelligence', b => b?.range && Array.isArray(b?.recommendations)],
  ['/api/v1/longitudinal', b => b?.range && Array.isArray(b?.year_comparison)],
  ['/api/v1/baselines', b => b?.range && Array.isArray(b?.baselines)],
  ['/api/v1/risks', b => b?.range && Array.isArray(b?.indicators)],
  ['/api/v1/insights', b => Array.isArray(b?.insights)],
  ['/api/v1/insights/timeline', b => Array.isArray(b?.generated) && Array.isArray(b?.history)],
  ['/api/v1/insights/history', b => Array.isArray(b?.history)]
]) {
  const { status, body } = await get(path);
  ok(`GET ${path} → 200`, status === 200, `got ${status}`);
  ok(`${path} contract`, check(body), JSON.stringify(body));
}

// 404
{
  const { status } = await get('/api/v1/nope');
  ok('unknown route → 404', status === 404, `got ${status}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
