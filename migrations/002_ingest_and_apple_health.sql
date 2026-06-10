-- 002_ingest_and_apple_health — write/ingest infrastructure + Apple Health vocab.
-- ADDITIVE-ONLY: new tables + new metric_types. No existing table/column/key is
-- altered. (Invariants 2, 3.)

-- Ingest audit log (goal 7). Stores the raw payload so an ingest can be replayed
-- byte-for-byte (goal 8). One row per POST to an ingest endpoint.
CREATE TABLE IF NOT EXISTS ingest_log (
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
CREATE INDEX IF NOT EXISTS idx_ingest_received ON ingest_log(received_at);

-- Quarantine (goal 10). Records that failed schema validation are parked here
-- instead of failing the whole batch — the valid records still land.
CREATE TABLE IF NOT EXISTS quarantine (
  id         INTEGER PRIMARY KEY,
  ingest_id  INTEGER REFERENCES ingest_log(id),
  source     TEXT,
  raw_record TEXT NOT NULL,                   -- JSON of the offending record
  reason     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quarantine_ingest ON quarantine(ingest_id);

-- Apple Health vocabulary (goals 21-25). Additive metric_types; data arrives via
-- the apple_health ingest endpoint (source 'apple_health', already seeded).
INSERT OR IGNORE INTO metric_types (key, display_name, unit, value_kind, status, description) VALUES
  ('heart.resting_rate', 'Resting heart rate',          'bpm',       'numeric', 'active', 'Daily resting heart rate (Apple Health).'),
  ('heart.hrv_sdnn',     'Heart rate variability (SDNN)','ms',       'numeric', 'active', 'Daily HRV SDNN (Apple Health).'),
  ('fitness.vo2max',     'VO2 max',                     'ml/kg/min', 'numeric', 'active', 'Cardio fitness / VO2 max (Apple Health).'),
  ('sleep.duration',     'Sleep duration',              'h',         'numeric', 'active', 'Asleep hours per night (Apple Health).'),
  ('activity.steps',     'Steps',                       'count',     'count',   'active', 'Daily step count (Apple Health).');
