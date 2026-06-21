// Migration-from-empty regression test.
//
// Part A — full production bootstrap (coredb seed + every migration, via
// buildDb) must yield the complete required schema: tables, the metric
// vocabulary the intelligence layer depends on, the seeded sources, the
// biomarker registry/ranges, and the 1-250 goal registry all marked complete.
//
// Part B — the migrate.mjs runner mechanics: applies all migrations from an
// empty DB exactly once, is idempotent on re-run, and detects checksum drift.
//
// KEY INVARIANT this test pins: base metrics (body.weight, fitness.session_volume,
// nutrition.*) are seeded by scripts/lib/coredb.mjs, NOT by migrations. A
// migrations-only DB is therefore incomplete; the real bootstrap is seed + migrate.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { rmSync } from 'node:fs';
import { buildDb, closeDb, migrationFiles, harness } from './fixtures.mjs';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');
const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATE = join(HERE, '..', '..', 'scripts', 'migrate.mjs');

const REQUIRED_TABLES = [
  'sources', 'metric_types', 'observations', 'derived_metrics', 'experiments',
  'ingest_log', 'quarantine', 'health_goals', 'biomarker_registry',
  'biomarker_reference_ranges', 'lab_results', 'insight_events',
  'health_milestones', 'symptom_categories', 'briefing_snapshots',
  'user_health_goals',
  'recommendation_actions'
];

const REQUIRED_SOURCES = ['manual', 'shred', 'apple_health', 'lab', 'health_core'];

// The metric vocabulary the intelligence/health-os/platform constants depend on.
// (Mirrors CORE_METRICS, BIOMARKERS, STRESS/MOOD/COMPOSITION/SLEEP/NUTRITION2/
// RECOVERY2/TRAINING2/BASELINE/RISK metric arrays.) Any removal breaks a feature.
const REQUIRED_METRICS = [
  'body.weight', 'fitness.session_volume', 'nutrition.calories', 'nutrition.protein',
  'nutrition.carbs', 'nutrition.fat', 'heart.resting_rate', 'heart.hrv_sdnn',
  'fitness.vo2max', 'sleep.duration', 'activity.steps',
  'blood.total_cholesterol', 'blood.ldl_cholesterol', 'blood.hdl_cholesterol',
  'blood.triglycerides', 'blood.apob', 'blood.glucose', 'blood.hba1c', 'blood.crp',
  'blood.vitamin_d', 'blood.ferritin', 'hormone.testosterone', 'hormone.cortisol',
  'stress.perceived', 'score.stress', 'score.recovery', 'score.fatigue', 'score.training_response',
  'mood.valence', 'mood.energy', 'mood.motivation', 'symptom.severity',
  'body.fat_percent', 'body.muscle_mass', 'body.lean_mass', 'body.visceral_fat', 'body.water_percent',
  'sleep.deep', 'sleep.rem', 'sleep.light', 'sleep.awake', 'sleep.bedtime', 'sleep.wake_time',
  'nutrition.fiber', 'nutrition.sodium', 'nutrition.water', 'nutrition.micronutrient_index', 'nutrition.meal_timing_score'
];

export function run() {
  const t = harness('migration regression (bootstrap from empty)');

  // ── Part A: full bootstrap end-state ───────────────────────────────────────
  {
    const db = buildDb();

    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
    const missingTables = REQUIRED_TABLES.filter(x => !tables.has(x));
    t.eq('all required tables present', missingTables, []);

    const metrics = new Set(db.prepare("SELECT key FROM metric_types WHERE status='active'").all().map(r => r.key));
    const missingMetrics = REQUIRED_METRICS.filter(x => !metrics.has(x));
    t.eq('all required metrics present', missingMetrics, []);
    t.ok('full metric vocabulary seeded (>=62)', metrics.size >= 62, `got ${metrics.size}`);

    const sources = new Set(db.prepare('SELECT name FROM sources').all().map(r => r.name));
    const missingSources = REQUIRED_SOURCES.filter(x => !sources.has(x));
    t.eq('all required sources present', missingSources, []);

    const g = db.prepare(`SELECT COUNT(*) total, COUNT(DISTINCT id) distinct_ids,
      MIN(id) lo, MAX(id) hi, SUM(CASE WHEN status='complete' THEN 1 ELSE 0 END) complete
      FROM health_goals`).get();
    t.eq('goal registry counts', { total: g.total, distinct_ids: g.distinct_ids, lo: g.lo, hi: g.hi, complete: g.complete },
      { total: 250, distinct_ids: 250, lo: 1, hi: 250, complete: 250 });

    // No gaps 1..250.
    const gaps = db.prepare(`
      WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 250)
      SELECT n FROM seq WHERE n NOT IN (SELECT id FROM health_goals)`).all().map(r => r.n);
    t.eq('no gaps in goal ids 1..250', gaps, []);

    // Domains 1..25 all represented.
    const domains = db.prepare('SELECT DISTINCT domain FROM health_goals ORDER BY domain').all().map(r => r.domain);
    t.eq('domains 1..25 present', domains, Array.from({ length: 25 }, (_, i) => i + 1));

    const reg = db.prepare('SELECT COUNT(*) n FROM biomarker_registry').get().n;
    const ranges = db.prepare('SELECT COUNT(DISTINCT metric_key) n FROM biomarker_reference_ranges').get().n;
    t.ok('biomarker registry seeded (>=12)', reg >= 12, `got ${reg}`);
    t.ok('reference ranges cover biomarkers (>=12)', ranges >= 12, `got ${ranges}`);

    closeDb(db);
  }

  // ── Part B: migrate.mjs runner mechanics ───────────────────────────────────
  const tmp = `/tmp/mig-runner-${process.pid}.db`;
  for (const ext of ['', '-wal', '-shm']) rmSync(tmp + ext, { force: true });
  const env = { ...process.env, CORE_DB: tmp };
  const migrate = (...flags) => execFileSync('node', [MIGRATE, ...flags], { env, encoding: 'utf8' });

  {
    const out = migrate();
    t.ok('fresh run applies all migrations', new RegExp(`done: ${migrationFiles().length} applied`).test(out), out.trim());

    const rerun = migrate();
    t.ok('re-run is idempotent (0 applied)', /done: 0 applied/.test(rerun), rerun.trim());

    const status = migrate('--status');
    t.ok('status shows no pending', !/pending/.test(status), status.trim());
    t.ok('status shows no drift', !/DRIFT/.test(status), status.trim());

    const recorded = new Database(tmp).prepare('SELECT COUNT(*) n FROM schema_migrations').get().n;
    t.eq('schema_migrations records every migration', recorded, migrationFiles().length);

    // Drift detection: tamper a recorded checksum, status must warn.
    const d = new Database(tmp);
    d.prepare("UPDATE schema_migrations SET checksum='tampered' WHERE version='001'").run();
    d.close();
    const drift = migrate('--status');
    t.ok('drift detected after tamper', /DRIFT/.test(drift), drift.trim());
  }
  for (const ext of ['', '-wal', '-shm']) rmSync(tmp + ext, { force: true });

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
