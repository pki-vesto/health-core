-- Health Core schema — GENERATED, do not edit by hand.
-- Source of truth: scripts/lib/coredb.mjs (SCHEMA) + migrations/*.sql
-- Regenerate: node scripts/dump-schema.mjs   |   verify: --check
-- Runtime-only (created by scripts/migrate.mjs, not a migration): schema_migrations.
-- Tables: 16, Indexes: 11

CREATE TABLE biomarker_reference_ranges (
  id          INTEGER PRIMARY KEY,
  metric_key  TEXT NOT NULL REFERENCES metric_types(key),
  sex         TEXT NOT NULL DEFAULT 'any',
  age_min     INTEGER NOT NULL DEFAULT 0,
  age_max     INTEGER NOT NULL DEFAULT 120,
  low         REAL NOT NULL,
  high        REAL NOT NULL,
  optimal_low REAL,
  optimal_high REAL,
  unit        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'default',
  UNIQUE(metric_key, sex, age_min, age_max, source)
);

CREATE TABLE biomarker_registry (
  metric_key  TEXT PRIMARY KEY REFERENCES metric_types(key),
  category    TEXT NOT NULL,
  specimen    TEXT NOT NULL DEFAULT 'blood',
  loinc       TEXT,
  description TEXT
);

CREATE TABLE briefing_snapshots (
  id             INTEGER PRIMARY KEY,
  period         TEXT NOT NULL,
  generated_at   TEXT NOT NULL,         -- ISO8601 in Europe/Amsterdam
  payload        TEXT NOT NULL,         -- JSON.stringify(briefing)
  payload_sha256 TEXT NOT NULL,
  summary        TEXT
);
CREATE INDEX idx_briefing_snapshots_period_generated_at
  ON briefing_snapshots(period, generated_at);
CREATE INDEX idx_briefing_snapshots_period_sha
  ON briefing_snapshots(period, payload_sha256);

CREATE TABLE derived_metrics (
  id              INTEGER PRIMARY KEY,
  metric_type     TEXT NOT NULL REFERENCES metric_types(key),
  timestamp       TEXT NOT NULL,
  value           REAL NOT NULL,
  unit            TEXT NOT NULL,
  formula_version TEXT NOT NULL,
  inputs          TEXT
);

CREATE TABLE experiments (
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

CREATE TABLE health_goals (
  id          INTEGER PRIMARY KEY,
  domain      INTEGER NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL,
  evidence    TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(status IN ('complete','partial','not_built','blocked'))
);
CREATE INDEX idx_health_goals_domain ON health_goals(domain);
CREATE INDEX idx_health_goals_status ON health_goals(status);

CREATE TABLE health_milestones (
  id          INTEGER PRIMARY KEY,
  timestamp   TEXT NOT NULL,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  detail      TEXT,
  metric_type TEXT REFERENCES metric_types(key),
  value       REAL
);

CREATE TABLE ingest_log (
  id                  INTEGER PRIMARY KEY,
  received_at         TEXT NOT NULL DEFAULT (datetime('now')),
  source              TEXT NOT NULL,          -- source name (e.g. 'apple_health')
  format              TEXT NOT NULL,          -- 'generic' | 'apple_health'
  status              TEXT NOT NULL,          -- 'accepted' | 'partial' | 'rejected'
  records_in          INTEGER NOT NULL DEFAULT 0,
  records_written     INTEGER NOT NULL DEFAULT 0,
  records_quarantined INTEGER NOT NULL DEFAULT 0,
  payload_sha256      TEXT,
  payload             TEXT,                   -- raw request body (for replay)
  error               TEXT,
  replay_of           INTEGER REFERENCES ingest_log(id)  -- set when this run replays another
);
CREATE INDEX idx_ingest_received ON ingest_log(received_at);

CREATE TABLE insight_events (
  id          INTEGER PRIMARY KEY,
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  impact      REAL NOT NULL DEFAULT 0,
  confidence  REAL NOT NULL DEFAULT 0,
  evidence    TEXT,
  source_data  TEXT,
  uncertainty TEXT
);

CREATE TABLE lab_results (
  id             INTEGER PRIMARY KEY,
  collected_at   TEXT NOT NULL,
  lab_name       TEXT,
  panel          TEXT,
  report_id      TEXT,
  raw_payload    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')), review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'approved', 'rejected')), reviewer_id TEXT, reviewed_at TEXT, biomarker_id TEXT REFERENCES biomarker_registry(metric_key), review_note TEXT, ingest_id INTEGER REFERENCES ingest_log(id), parsed_review TEXT,
  UNIQUE(lab_name, report_id)
);
CREATE INDEX idx_lab_results_ingest ON lab_results(ingest_id);
CREATE INDEX idx_lab_results_review_status ON lab_results(review_status);

CREATE TABLE metric_types (
  key          TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  unit         TEXT NOT NULL,
  value_kind   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  description  TEXT
);

CREATE TABLE observations (
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
CREATE INDEX idx_obs_metric    ON observations(metric_type);
CREATE INDEX idx_obs_timestamp ON observations(timestamp);

CREATE TABLE quarantine (
  id         INTEGER PRIMARY KEY,
  ingest_id  INTEGER REFERENCES ingest_log(id),
  source     TEXT,
  raw_record TEXT NOT NULL,                   -- JSON of the offending record
  reason     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_quarantine_ingest ON quarantine(ingest_id);

CREATE TABLE recommendation_actions (
  id           INTEGER PRIMARY KEY,
  rec_key      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('acknowledged','snoozed','dismissed','done')),
  snooze_until TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_rec_actions_key_created
  ON recommendation_actions(rec_key, created_at DESC);

CREATE TABLE sources (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  kind  TEXT NOT NULL
);

CREATE TABLE symptom_categories (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT
);

