-- 008_briefing_history — persistent snapshots of generated briefings.
-- Additive-only: a new table only, no destructive change. `brief()` (api/lib/
-- health-os.js) previously recomputed each request and persisted nothing, so the
-- OS had no memory of past briefings. This table records each generated briefing
-- as an immutable row so /briefing/history, /briefing/:id and /:id/diff can
-- return a stable artifact and compute "what changed since last time".
--
-- generated_at is stored as ISO8601 in Europe/Amsterdam (assembled in JS via
-- Intl.DateTimeFormat) so day-bucketing for dedupe is timezone-correct even
-- across UTC midnight. Dedupe within a day is by (period, payload_sha256,
-- substr(generated_at,1,10)) — see api/lib/health-os.js snapshotBriefing().

CREATE TABLE IF NOT EXISTS briefing_snapshots (
  id             INTEGER PRIMARY KEY,
  period         TEXT NOT NULL,
  generated_at   TEXT NOT NULL,         -- ISO8601 in Europe/Amsterdam
  payload        TEXT NOT NULL,         -- JSON.stringify(briefing)
  payload_sha256 TEXT NOT NULL,
  summary        TEXT
);

CREATE INDEX IF NOT EXISTS idx_briefing_snapshots_period_generated_at
  ON briefing_snapshots(period, generated_at);
CREATE INDEX IF NOT EXISTS idx_briefing_snapshots_period_sha
  ON briefing_snapshots(period, payload_sha256);
