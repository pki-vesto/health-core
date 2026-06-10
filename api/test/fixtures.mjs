// Shared test fixtures + harness for deterministic, offline unit tests.
//
// buildDb() bootstraps a TEMP SQLite database exactly the way production is
// bootstrapped — scripts/lib/coredb.mjs schema + seed (base metrics/sources),
// then every numbered migration in order — so tests see the real catalog
// (base + Apple Health + biomarkers + platform metrics) and the 1-250 goal
// registry. Observations are then inserted directly so each test controls its
// own data and asserts EXACT outputs (the scoring code rounds, so rounded
// outputs compare exactly).
//
// Run inside the api image with the repo mounted, e.g.:
//   docker run --rm -v "$HOME/health-core":/work -w /work/api \
//     health-core-api:latest node test/unit.mjs
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA, seed } from '../../scripts/lib/coredb.mjs';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

const HERE = dirname(fileURLToPath(import.meta.url));
const MIG = join(HERE, '..', '..', 'migrations');

let counter = 0;

// Build a fresh temp DB. `facts` controls coredb conditional metrics; default
// false/false mirrors the live Core (no measurement/RPE vocabulary seeded).
export function buildDb(facts = { measurements: false, rpe: false }) {
  const path = `/tmp/test-fix-${process.pid}-${counter++}.db`;
  rmSync(path, { force: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seed(db, facts);
  for (const f of migrationFiles()) db.exec(readFileSync(join(MIG, f), 'utf8'));
  db.__path = path;
  return db;
}

export function migrationFiles() {
  return readdirSync(MIG).filter(f => /^\d+.*\.sql$/.test(f)).sort();
}

export function closeDb(db) {
  const p = db.__path;
  try { db.close(); } catch {}
  if (p) rmSync(p, { force: true });
}

// Insert one observation. unit defaults to the metric's catalog unit (so the
// integrity invariant holds); external_id/source_updated_at are synthesised
// deterministically so re-inserting the same (source,metric,date) is a no-op-ish
// duplicate-key error caught by the caller if unintended.
export function insertObs(db, { metric, date, value, source = 'manual', unit, externalId, sourceUpdatedAt, metadata }) {
  const srcId = db.prepare('SELECT id FROM sources WHERE name = ?').get(source)?.id;
  if (srcId == null) throw new Error(`source '${source}' not seeded`);
  const cunit = unit ?? db.prepare('SELECT unit FROM metric_types WHERE key = ?').get(metric)?.unit;
  if (cunit == null) throw new Error(`metric '${metric}' not in catalog`);
  const ext = externalId ?? `${source}:${metric}:${date}`;
  const sua = sourceUpdatedAt ?? `${date}T00:00:00.000Z`;
  db.prepare(
    `INSERT INTO observations (timestamp, metric_type, value, unit, source, external_id, source_updated_at, metadata)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(date, metric, value, cunit, srcId, ext, sua, metadata ? JSON.stringify(metadata) : null);
}

// Seed consecutive daily values starting at `startDate`. A null/undefined entry
// skips that day (leaves a gap). Returns the next unused date.
export function seedDaily(db, metric, startDate, values, opts = {}) {
  let d = startDate;
  for (const v of values) {
    if (v != null) insertObs(db, { metric, date: d, value: v, ...opts });
    d = addDays(d, 1);
  }
  return d;
}

export function addDays(date, n) {
  const x = new Date(date + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

// Minimal assertion harness. Each test module builds one of these, returns the
// fail count from run(), and the aggregator (unit.mjs) sums them.
export function harness(title) {
  let pass = 0, fail = 0;
  if (title) console.log(`\n${title}`);
  const ok = (n, c, d = '') => c
    ? (pass++, console.log(`  ✓ ${n}`))
    : (fail++, console.error(`  ✗ ${n}${d ? ' — ' + d : ''}`));
  const eq = (n, got, want) =>
    ok(n, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  const near = (n, got, want, eps = 1e-9) =>
    ok(n, got != null && Number.isFinite(got) && Math.abs(got - want) <= eps, `got ${got} want ${want}`);
  const throws = (n, fn, status) => {
    let t = false; try { fn(); } catch (e) { t = status == null || e.status === status; }
    ok(n, t, `expected throw${status ? ' status ' + status : ''}`);
  };
  return {
    ok, eq, near, throws,
    counts: () => ({ pass, fail }),
    summary: () => { console.log(`\n  ${pass} passed, ${fail} failed`); return fail; }
  };
}
