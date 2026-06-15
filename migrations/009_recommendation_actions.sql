-- 009_recommendation_actions — additive lifecycle layer for decisionSupport().
--
-- Background: `decisionSupport()` (api/lib/health-os.js) emits recommendations
-- on every request but stored nothing, so the same advice resurfaced after the
-- owner had already acted on it. This table records each acknowledge / snooze /
-- dismiss / done event against a stable `rec_key` (a deterministic identifier
-- derived from `type` + `metric|subject`, see recKey() in lib/health-os.js).
--
-- The read path (decisionSupport) picks the LATEST row per rec_key and:
--   • drops the rec when status ∈ ('dismissed','done');
--   • drops the rec when status='snoozed' AND snooze_until is in the future
--     (Europe/Amsterdam day boundary — same clock the briefing layer uses);
--   • surfaces it again once the snooze expires.
--
-- Additive-only: never re-purpose `rec_key`; never widen the status set without
-- a follow-up migration. snooze_until is ISO8601 in Europe/Amsterdam (matches
-- briefing_snapshots.generated_at convention).

CREATE TABLE IF NOT EXISTS recommendation_actions (
  id           INTEGER PRIMARY KEY,
  rec_key      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('acknowledged','snoozed','dismissed','done')),
  snooze_until TEXT,
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rec_actions_key_created
  ON recommendation_actions(rec_key, created_at DESC);
