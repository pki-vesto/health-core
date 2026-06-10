// Health Core DB helpers shared by init / backfill / validate.
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

// ── Schema (Step 1) ─────────────────────────────────────────────────────────
// Additive-only. CREATE IF NOT EXISTS so init is idempotent.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS sources (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  kind  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_types (
  key          TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  unit         TEXT NOT NULL,
  value_kind   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  description  TEXT
);

CREATE TABLE IF NOT EXISTS observations (
  id                INTEGER PRIMARY KEY,
  timestamp         TEXT NOT NULL,
  metric_type       TEXT NOT NULL REFERENCES metric_types(key),
  value             REAL NOT NULL,
  unit              TEXT NOT NULL,
  source            INTEGER NOT NULL REFERENCES sources(id),
  external_id       TEXT NOT NULL,
  source_updated_at TEXT,
  metadata          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source, external_id, metric_type)
);

CREATE INDEX IF NOT EXISTS idx_obs_metric    ON observations(metric_type);
CREATE INDEX IF NOT EXISTS idx_obs_timestamp ON observations(timestamp);

CREATE TABLE IF NOT EXISTS derived_metrics (
  id              INTEGER PRIMARY KEY,
  metric_type     TEXT NOT NULL REFERENCES metric_types(key),
  timestamp       TEXT NOT NULL,
  value           REAL NOT NULL,
  unit            TEXT NOT NULL,
  formula_version TEXT NOT NULL,
  inputs          TEXT
);

CREATE TABLE IF NOT EXISTS experiments (
  id             INTEGER PRIMARY KEY,
  hypothesis     TEXT NOT NULL,
  intervention   TEXT NOT NULL,
  reversible     INTEGER NOT NULL DEFAULT 0,
  design         TEXT NOT NULL DEFAULT 'single',
  metric_type    TEXT REFERENCES metric_types(key),
  baseline_start TEXT, baseline_end TEXT,
  test_start     TEXT, test_end TEXT,
  status         TEXT NOT NULL DEFAULT 'planned',
  result         TEXT
);
`;

// ── Seed data (Step 2) ──────────────────────────────────────────────────────
export const SOURCES = [
  { name: 'manual',       kind: 'user' },    // hand-entered by the user
  { name: 'shred',        kind: 'module' },  // Shred Tracker module (backfill + live)
  { name: 'apple_health', kind: 'device' },  // reserved
  { name: 'lab',          kind: 'lab' }       // reserved
];

// Catalog v1. `cond` is evaluated against discovered facts by init-db.mjs.
// 'always' = seed unconditionally; 'measurements' = only if body measures exist;
// 'rpe' = only if RPE data exists. (Measurements and RPE do NOT exist in this DB,
// so those keys are intentionally not seeded — additive-only: add later when the
// data appears.)
export const METRIC_TYPES = [
  { key: 'body.weight',            display_name: 'Body weight',          unit: 'kg',    value_kind: 'numeric', cond: 'always',       description: 'Raw bodyweight measurement.' },
  { key: 'body.waist',             display_name: 'Waist circumference',  unit: 'cm',    value_kind: 'numeric', cond: 'measurements', description: 'Raw waist measurement.' },
  { key: 'body.hip',               display_name: 'Hip circumference',    unit: 'cm',    value_kind: 'numeric', cond: 'measurements', description: 'Raw hip measurement.' },
  { key: 'body.chest',             display_name: 'Chest circumference',  unit: 'cm',    value_kind: 'numeric', cond: 'measurements', description: 'Raw chest measurement.' },
  { key: 'body.arm',               display_name: 'Arm circumference',    unit: 'cm',    value_kind: 'numeric', cond: 'measurements', description: 'Raw arm measurement.' },
  { key: 'fitness.session_volume', display_name: 'Session volume',       unit: 'kg',    value_kind: 'numeric', cond: 'always',       description: 'Σ weight×reps over a training day (derived from shred.sets).' },
  { key: 'fitness.session_rpe_avg',display_name: 'Session average RPE',  unit: 'score', value_kind: 'numeric', cond: 'rpe',          description: 'Average RPE over a training session.' },
  { key: 'nutrition.calories',     display_name: 'Calories',             unit: 'kcal',  value_kind: 'numeric', cond: 'always',       description: 'Day total energy (derived from shred.foods).' },
  { key: 'nutrition.protein',      display_name: 'Protein',              unit: 'g',     value_kind: 'numeric', cond: 'always',       description: 'Day total protein (derived from shred.foods).' },
  { key: 'nutrition.carbs',        display_name: 'Carbohydrates',        unit: 'g',     value_kind: 'numeric', cond: 'always',       description: 'Day total carbs (derived from shred.foods).' },
  { key: 'nutrition.fat',          display_name: 'Fat',                  unit: 'g',     value_kind: 'numeric', cond: 'always',       description: 'Day total fat (derived from shred.foods).' }
];

export function openCore(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function ensureSchema(db) {
  db.exec(SCHEMA);
}

// Seed sources + metric_types. Idempotent (INSERT OR IGNORE keeps existing rows;
// additive-only — never rewrites a key's meaning). `facts` decides conditionals.
export function seed(db, facts = { measurements: false, rpe: false }) {
  const insSource = db.prepare('INSERT OR IGNORE INTO sources (name, kind) VALUES (?, ?)');
  for (const s of SOURCES) insSource.run(s.name, s.kind);

  const insMetric = db.prepare(
    `INSERT OR IGNORE INTO metric_types (key, display_name, unit, value_kind, status, description)
     VALUES (?, ?, ?, ?, 'active', ?)`
  );
  const seededKeys = [];
  for (const m of METRIC_TYPES) {
    if (m.cond === 'measurements' && !facts.measurements) continue;
    if (m.cond === 'rpe' && !facts.rpe) continue;
    insMetric.run(m.key, m.display_name, m.unit, m.value_kind, m.description);
    seededKeys.push(m.key);
  }
  return seededKeys;
}

export function getSourceId(db, name) {
  const row = db.prepare('SELECT id FROM sources WHERE name = ?').get(name);
  if (!row) throw new Error(`source '${name}' not seeded`);
  return row.id;
}

// The Step-3 upsert: insert an observation, or LWW-update value when the
// incoming source_updated_at is strictly newer. metadata/timestamp are NOT
// touched on conflict (so backfill provenance survives until live actually
// supersedes the value). Shared verbatim by backfill and live dual-write.
export const UPSERT_SQL = `
INSERT INTO observations
  (metric_type, value, unit, timestamp, source, external_id, source_updated_at, metadata)
VALUES
  (@metric_type, @value, @unit, @timestamp, @source, @external_id, @source_updated_at, @metadata)
ON CONFLICT(source, external_id, metric_type) DO UPDATE SET
  value             = excluded.value,
  source_updated_at = excluded.source_updated_at,
  updated_at        = datetime('now')
WHERE excluded.source_updated_at > observations.source_updated_at;
`;

export function prepareUpsert(db) {
  return db.prepare(UPSERT_SQL);
}
