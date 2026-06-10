-- 006_goal_registry_1_25 — make the full 1-250 goal registry queryable.

INSERT INTO health_goals (id, domain, title, status, evidence) VALUES
  (1, 1, 'Core API is official Core access', 'complete', 'api/server.js + GET /api/v1/observations'),
  (2, 1, 'Eliminate direct DB access for new systems', 'complete', 'API and ingest paths expose Core access'),
  (3, 1, 'API versioning', 'complete', '/api/v1 routes'),
  (4, 1, 'Authentication', 'complete', 'CORE_BEARER_TOKEN support'),
  (5, 1, 'Authorization', 'complete', 'single-user bearer/tailnet access model'),
  (6, 1, 'Request logging', 'complete', 'structured request logging middleware'),
  (7, 1, 'Ingest logging', 'complete', 'ingest_log table + routes'),
  (8, 1, 'Replay mechanism', 'complete', 'POST /api/v1/ingest/:id/replay'),
  (9, 1, 'Schema validation', 'complete', 'api/lib/ingest.js validation'),
  (10, 1, 'Quarantine table', 'complete', 'quarantine table + route'),
  (11, 1, 'Source management API', 'complete', 'GET/POST /api/v1/sources'),
  (12, 1, 'Metric management API', 'complete', 'GET/POST/PATCH /api/v1/metrics'),
  (13, 1, 'Migration framework', 'complete', 'scripts/migrate.mjs + schema_migrations'),
  (14, 1, 'Integrity checks', 'complete', 'GET /api/v1/integrity'),
  (15, 1, 'Automatic health checks', 'complete', 'GET /api/health'),
  (16, 2, 'Auto Health Export ingest', 'complete', 'POST /api/v1/ingest/apple-health'),
  (17, 2, 'Historical imports', 'complete', '50 MB JSON ingest + date preserving mapper'),
  (18, 2, 'Batch processing', 'complete', 'transactional ingestRecords batch path'),
  (19, 2, 'Replay processing', 'complete', 'POST /api/v1/ingest/:id/replay'),
  (20, 2, 'Corrected exports', 'complete', 'Last-write-wins source_updated_at handling'),
  (21, 2, 'Resting heart rate', 'complete', 'heart.resting_rate mapper'),
  (22, 2, 'HRV', 'complete', 'heart.hrv_sdnn mapper'),
  (23, 2, 'VO2Max', 'complete', 'fitness.vo2max mapper'),
  (24, 2, 'Sleep data', 'complete', 'sleep.duration mapper'),
  (25, 2, 'Steps', 'complete', 'activity.steps mapper')
ON CONFLICT(id) DO UPDATE SET
  domain = excluded.domain,
  title = excluded.title,
  status = excluded.status,
  evidence = excluded.evidence,
  updated_at = datetime('now');
