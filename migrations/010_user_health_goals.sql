-- 010_user_health_goals — additive owner-defined health goal surface.
--
-- This table stores declarative goals only. Goal progress/adherence is a pure
-- read model computed from user_health_goals + observations; no cache table is
-- created here and read routes must not write.

CREATE TABLE IF NOT EXISTS user_health_goals (
  id           INTEGER PRIMARY KEY,
  title        TEXT NOT NULL,
  metric_key   TEXT NOT NULL REFERENCES metric_types(key),
  comparator   TEXT NOT NULL CHECK (comparator IN ('gte','lte','eq','range')),
  target_value REAL,
  target_min   REAL,
  target_max   REAL,
  window       TEXT NOT NULL DEFAULT 'latest' CHECK (window IN ('latest','daily')),
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (comparator IN ('gte','lte','eq') AND target_value IS NOT NULL AND target_min IS NULL AND target_max IS NULL)
    OR
    (comparator = 'range' AND target_min IS NOT NULL AND target_max IS NOT NULL AND target_value IS NULL AND target_min <= target_max)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_health_goals_status
  ON user_health_goals(status);

CREATE INDEX IF NOT EXISTS idx_user_health_goals_metric
  ON user_health_goals(metric_key);
