-- 001_baseline — Health Core V1 schema as the migration baseline.
-- Idempotent (CREATE IF NOT EXISTS): applying this against the already-live
-- core.db is a no-op on existing tables; it only records 001 as the baseline so
-- every future schema change flows through numbered, checksum-tracked migrations.
-- ADDITIVE-ONLY POLICY: migrations may CREATE tables/indexes/columns and seed
-- vocabulary; they must never rename/drop/repurpose an existing metric key,
-- column, or table. (Architecture invariants 2, 3.)

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
