// Single pre-deploy verification gate. This orchestrates existing checks; it
// does not duplicate their logic.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const BASE = process.env.BASE || '';
const RUN_E2E = args.has('--e2e') || process.env.RUN_E2E === '1';
const NODE_MODULES_BASE = process.env.NODE_MODULES_BASE || join(ROOT, 'api', 'node_modules', 'noop.js');

const results = [];

function duration(start) {
  return Math.round(Number(process.hrtime.bigint() - start) / 1e6);
}

function runStep(name, command, commandArgs, opts = {}) {
  const start = process.hrtime.bigint();
  console.log(`\n==> ${name}`);
  const child = spawnSync(command, commandArgs, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, NODE_MODULES_BASE, ...(opts.env || {}) },
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  const ms = duration(start);
  const ok = child.status === 0;
  results.push({ name, status: ok ? 'passed' : 'failed', ms });
  console.log(`==> ${name}: ${ok ? 'passed' : 'failed'} (${ms}ms)`);
}

function skipStep(name, reason) {
  results.push({ name, status: 'skipped', reason, ms: 0 });
  console.log(`\n==> ${name}: skipped (${reason})`);
}

async function liveReachable() {
  if (!BASE) return { ok: false, reason: 'BASE not set' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(new URL('/api/health', BASE), { signal: controller.signal });
    clearTimeout(timer);
    return res.ok ? { ok: true } : { ok: false, reason: `/api/health returned ${res.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

runStep('offline unit suite', process.execPath, ['api/test/unit.mjs']);
runStep('governance consistency', process.execPath, ['scripts/governance-check.mjs']);
runStep('schema drift check', process.execPath, ['scripts/dump-schema.mjs', '--check']);

const live = await liveReachable();
if (live.ok) {
  runStep('live smoke', process.execPath, ['api/test/smoke.mjs'], { env: { BASE } });
} else {
  skipStep('live smoke', live.reason);
}

if (!RUN_E2E) {
  skipStep('playwright e2e', 'pass --e2e or RUN_E2E=1');
} else if (!live.ok) {
  skipStep('playwright e2e', `no reachable live server (${live.reason})`);
} else if (process.env.E2E_MUTATING_OK !== '1') {
  skipStep('playwright e2e', 'set E2E_MUTATING_OK=1 after pointing BASE at a disposable Core DB');
} else {
  runStep('playwright e2e', 'npx', ['playwright', 'test'], {
    cwd: join(ROOT, 'e2e'),
    env: { BASE_URL: BASE }
  });
}

console.log('\nPre-deploy check summary');
for (const r of results) {
  const suffix = r.status === 'skipped' ? ` (${r.reason})` : ` (${r.ms}ms)`;
  console.log(`- ${r.name}: ${r.status}${suffix}`);
}

const failed = results.filter((r) => r.status === 'failed');
if (failed.length) {
  console.error(`\nVERDICT: failed (${failed.length} step${failed.length === 1 ? '' : 's'})`);
  process.exit(1);
}

console.log('\nVERDICT: passed');
