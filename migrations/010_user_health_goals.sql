-- 009_user_health_goals — owner-defined personal health targets (issue #34).
-- Additive-only: a new table only, no destructive change. This is distinct from
-- the existing `health_goals` table (the 1-250 dev registry behind /api/v1/goals
-- and /progress) — that surface stays untouched. `user_health_goals` is the
-- intent layer the owner uses to declare what "good" means for them, so the
-- platform can later evaluate progress against observations (child issue #4) and
-- surface due goals in the briefing (child issue #5).
--
-- metric_key references metric_types(key): only existing metric semantics may be
-- targeted — never mint new metric meaning here. Comparator + value fields are
-- enforced at the route layer (range needs target_low/high, lte/gte/eq need
-- target_value); the CHECK constraint here pins the comparator/status vocab.
-- Retire/pause is a status change, never a row deletion.

CREATE TABLE IF NOT EXISTS user_health_goals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_key   TEXT NOT NULL REFERENCES metric_types(key),
  comparator   TEXT NOT NULL CHECK (comparator IN ('lte','gte','eq','range')),
  target_value REAL,
  target_low   REAL,
  target_high  REAL,
  window       TEXT,
  deadline     TEXT,
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','paused','achieved','retired')),
  label        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_health_goals_status
  ON user_health_goals(status);
CREATE INDEX IF NOT EXISTS idx_user_health_goals_metric_key
  ON user_health_goals(metric_key);
