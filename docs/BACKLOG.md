# Health Core Backlog

Date: 2026-06-09

Implementation note 2026-06-15: Core DB backup and observations export are
available through `scripts/backup-core.mjs` and `/api/v1/export/observations*`.
Manual quick-log is available through the Track UI and posts to the existing
generic ingest path with stable same-day correction semantics.

Implementation note 2026-06-20: The Daily Loop backend now exposes
`/api/v1/today`, a stable read-only digest over persisted daily briefing
snapshots, lifecycle-filtered recommendations and goal progress.

This is the central machine-readable backlog. The JSON block is the source of truth for goals 1-250.

```json
[
  {
    "number": 1,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Core API is official Core access",
    "description": "Core API is official Core access in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: api/server.js + GET /api/v1/observations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "api/server.js + GET /api/v1/observations"
  },
  {
    "number": 2,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Eliminate direct DB access for new systems",
    "description": "Eliminate direct DB access for new systems in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: API and ingest paths expose Core access",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "API and ingest paths expose Core access"
  },
  {
    "number": 3,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "API versioning",
    "description": "API versioning in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: /api/v1 routes",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "/api/v1 routes"
  },
  {
    "number": 4,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Authentication",
    "description": "Authentication in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: CORE_BEARER_TOKEN support",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "CORE_BEARER_TOKEN support"
  },
  {
    "number": 5,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Authorization",
    "description": "Authorization in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: single-user bearer/tailnet access model",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "single-user bearer/tailnet access model"
  },
  {
    "number": 6,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Request logging",
    "description": "Request logging in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: structured request logging middleware",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "structured request logging middleware"
  },
  {
    "number": 7,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Ingest logging",
    "description": "Ingest logging in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: ingest_log table + routes",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "ingest_log table + routes"
  },
  {
    "number": 8,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Replay mechanism",
    "description": "Replay mechanism in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: POST /api/v1/ingest/:id/replay",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "POST /api/v1/ingest/:id/replay"
  },
  {
    "number": 9,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Schema validation",
    "description": "Schema validation in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: api/lib/ingest.js validation",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "api/lib/ingest.js validation"
  },
  {
    "number": 10,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Quarantine table",
    "description": "Quarantine table in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: quarantine table + route",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "quarantine table + route"
  },
  {
    "number": 11,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Source management API",
    "description": "Source management API in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: GET/POST /api/v1/sources",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET/POST /api/v1/sources"
  },
  {
    "number": 12,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Metric management API",
    "description": "Metric management API in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: GET/POST/PATCH /api/v1/metrics",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET/POST/PATCH /api/v1/metrics"
  },
  {
    "number": 13,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Migration framework",
    "description": "Migration framework in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: scripts/migrate.mjs + schema_migrations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "scripts/migrate.mjs + schema_migrations"
  },
  {
    "number": 14,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Integrity checks",
    "description": "Integrity checks in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/integrity",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/integrity"
  },
  {
    "number": 15,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Automatic health checks",
    "description": "Automatic health checks in the Platform foundation domain.",
    "status": "completed",
    "dependencies": [],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/health",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/health"
  },
  {
    "number": 16,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Auto Health Export ingest",
    "description": "Auto Health Export ingest in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: POST /api/v1/ingest/apple-health",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "POST /api/v1/ingest/apple-health"
  },
  {
    "number": 17,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Historical imports",
    "description": "Historical imports in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: 50 MB JSON ingest + date preserving mapper",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "50 MB JSON ingest + date preserving mapper"
  },
  {
    "number": 18,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Batch processing",
    "description": "Batch processing in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: transactional ingestRecords batch path",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "transactional ingestRecords batch path"
  },
  {
    "number": 19,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Replay processing",
    "description": "Replay processing in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: POST /api/v1/ingest/:id/replay",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "POST /api/v1/ingest/:id/replay"
  },
  {
    "number": 20,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Corrected exports",
    "description": "Corrected exports in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: Last-write-wins source_updated_at handling",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "Last-write-wins source_updated_at handling"
  },
  {
    "number": 21,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Resting heart rate",
    "description": "Resting heart rate in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: heart.resting_rate mapper",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "heart.resting_rate mapper"
  },
  {
    "number": 22,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "HRV",
    "description": "HRV in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: heart.hrv_sdnn mapper",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "heart.hrv_sdnn mapper"
  },
  {
    "number": 23,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "VO2Max",
    "description": "VO2Max in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: fitness.vo2max mapper",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "fitness.vo2max mapper"
  },
  {
    "number": 24,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Sleep data",
    "description": "Sleep data in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: sleep.duration mapper",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "sleep.duration mapper"
  },
  {
    "number": 25,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Steps",
    "description": "Steps in the Apple Health integration domain.",
    "status": "completed",
    "dependencies": [
      1,
      3,
      7,
      9,
      13
    ],
    "acceptance_criteria": [
      "Code evidence exists: activity.steps mapper",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "activity.steps mapper"
  },
  {
    "number": 26,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Build dashboard foundation",
    "description": "Build dashboard foundation in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/dashboard"
  },
  {
    "number": 27,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show today snapshot",
    "description": "Show today snapshot in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/observations/latest + /dashboard cards",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/observations/latest + /dashboard cards"
  },
  {
    "number": 28,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show metric cards",
    "description": "Show metric cards in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/dashboard cards[]",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/dashboard cards[]"
  },
  {
    "number": 29,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show trend windows",
    "description": "Show trend windows in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/dashboard?days=",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/dashboard?days="
  },
  {
    "number": 30,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show alerts",
    "description": "Show alerts in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/dashboard alerts[]",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/dashboard alerts[]"
  },
  {
    "number": 31,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support chart-ready series",
    "description": "Support chart-ready series in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/series/:metric",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/series/:metric"
  },
  {
    "number": 32,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support summary statistics",
    "description": "Support summary statistics in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/stats",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/stats"
  },
  {
    "number": 33,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support domain navigation data",
    "description": "Support domain navigation data in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/{training,nutrition,recovery}/summary",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/{training,nutrition,recovery}/summary"
  },
  {
    "number": 34,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support dashboard range controls",
    "description": "Support dashboard range controls in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: days/to query params",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "days/to query params"
  },
  {
    "number": 35,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Expose dashboard contract",
    "description": "Expose dashboard contract in the Dashboard foundation domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: docs/API.md",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "docs/API.md"
  },
  {
    "number": 36,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Build training analytics summary",
    "description": "Build training analytics summary in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/summary",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/summary"
  },
  {
    "number": 37,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Track session volume",
    "description": "Track session volume in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: fitness.session_volume",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "fitness.session_volume"
  },
  {
    "number": 38,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Track activity steps in training context",
    "description": "Track activity steps in training context in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: activity.steps",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "activity.steps"
  },
  {
    "number": 39,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Track VO2 max in training context",
    "description": "Track VO2 max in training context in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: fitness.vo2max",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "fitness.vo2max"
  },
  {
    "number": 40,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Compute training trends",
    "description": "Compute training trends in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: training summary trend objects",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "training summary trend objects"
  },
  {
    "number": 41,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Compute training load score",
    "description": "Compute training load score in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: dashboard.summary.training_load",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "dashboard.summary.training_load"
  },
  {
    "number": 42,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Support training history windows",
    "description": "Support training history windows in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: days/to query params",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "days/to query params"
  },
  {
    "number": 43,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Expose training metrics as Core metric types",
    "description": "Expose training metrics as Core metric types in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: metric_types registry",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "metric_types registry"
  },
  {
    "number": 44,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Support training chart series",
    "description": "Support training chart series in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /series/fitness.session_volume",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /series/fitness.session_volume"
  },
  {
    "number": 45,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Keep training analytics read-only",
    "description": "Keep training analytics read-only in the Training analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: query_only read path",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "query_only read path"
  },
  {
    "number": 46,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Build nutrition analytics summary",
    "description": "Build nutrition analytics summary in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/nutrition/summary",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/nutrition/summary"
  },
  {
    "number": 47,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track calories",
    "description": "Track calories in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.calories",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.calories"
  },
  {
    "number": 48,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track protein",
    "description": "Track protein in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.protein",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.protein"
  },
  {
    "number": 49,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track carbohydrates",
    "description": "Track carbohydrates in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.carbs",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.carbs"
  },
  {
    "number": 50,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track fat",
    "description": "Track fat in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.fat",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.fat"
  },
  {
    "number": 51,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Compute macro balance",
    "description": "Compute macro balance in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition summary macro_balance",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition summary macro_balance"
  },
  {
    "number": 52,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Compute nutrition consistency",
    "description": "Compute nutrition consistency in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: dashboard.summary.nutrition_consistency",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "dashboard.summary.nutrition_consistency"
  },
  {
    "number": 53,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Support nutrition trends",
    "description": "Support nutrition trends in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition summary trend objects",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition summary trend objects"
  },
  {
    "number": 54,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Support nutrition chart series",
    "description": "Support nutrition chart series in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /series/nutrition.calories",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /series/nutrition.calories"
  },
  {
    "number": 55,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Keep nutrition analytics derived from observations",
    "description": "Keep nutrition analytics derived from observations in the Nutrition analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: read-only intelligence layer",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "read-only intelligence layer"
  },
  {
    "number": 56,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Build recovery analytics summary",
    "description": "Build recovery analytics summary in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/summary",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/summary"
  },
  {
    "number": 57,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Use sleep duration",
    "description": "Use sleep duration in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: sleep.duration",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "sleep.duration"
  },
  {
    "number": 58,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Use HRV",
    "description": "Use HRV in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: heart.hrv_sdnn",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "heart.hrv_sdnn"
  },
  {
    "number": 59,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Use resting heart rate",
    "description": "Use resting heart rate in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: heart.resting_rate",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "heart.resting_rate"
  },
  {
    "number": 60,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Compute recovery score",
    "description": "Compute recovery score in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: recovery_summary.recovery_score",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "recovery_summary.recovery_score"
  },
  {
    "number": 61,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Support recovery trends",
    "description": "Support recovery trends in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: recovery summary trend objects",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "recovery summary trend objects"
  },
  {
    "number": 62,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Support recovery alerts",
    "description": "Support recovery alerts in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: dashboard alerts[]",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "dashboard alerts[]"
  },
  {
    "number": 63,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Support recovery chart series",
    "description": "Support recovery chart series in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /series/sleep.duration",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /series/sleep.duration"
  },
  {
    "number": 64,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Integrate Apple Health recovery signals",
    "description": "Integrate Apple Health recovery signals in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: Apple Health metrics 21-25",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "Apple Health metrics 21-25"
  },
  {
    "number": 65,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Keep recovery analytics local-first",
    "description": "Keep recovery analytics local-first in the Recovery analytics domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: local SQLite only",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "local SQLite only"
  },
  {
    "number": 66,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Build correlation engine",
    "description": "Build correlation engine in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/correlations"
  },
  {
    "number": 67,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Support metric pair correlations",
    "description": "Support metric pair correlations in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: correlations[].a/b/r",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "correlations[].a/b/r"
  },
  {
    "number": 68,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Support configurable correlation windows",
    "description": "Support configurable correlation windows in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: days/to params",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "days/to params"
  },
  {
    "number": 69,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Support metric filters",
    "description": "Support metric filters in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: metrics param",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "metrics param"
  },
  {
    "number": 70,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Require enough paired samples",
    "description": "Require enough paired samples in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: minimum n=3",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "minimum n=3"
  },
  {
    "number": 71,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Sort strongest correlations first",
    "description": "Sort strongest correlations first in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: absolute r sorting",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "absolute r sorting"
  },
  {
    "number": 72,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Correlate training and recovery",
    "description": "Correlate training and recovery in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: CORE_METRICS pair engine",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "CORE_METRICS pair engine"
  },
  {
    "number": 73,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Correlate nutrition and body signals",
    "description": "Correlate nutrition and body signals in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: CORE_METRICS pair engine",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "CORE_METRICS pair engine"
  },
  {
    "number": 74,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Return sample counts",
    "description": "Return sample counts in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: correlations[].n",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "correlations[].n"
  },
  {
    "number": 75,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Keep correlation engine deterministic",
    "description": "Keep correlation engine deterministic in the Correlation engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: pure SQL + JS math",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "pure SQL + JS math"
  },
  {
    "number": 76,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Build experiment framework read model",
    "description": "Build experiment framework read model in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/experiments/readiness",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/experiments/readiness"
  },
  {
    "number": 77,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Expose existing experiments table",
    "description": "Expose existing experiments table in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: experiments[]",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "experiments[]"
  },
  {
    "number": 78,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Identify candidate metrics",
    "description": "Identify candidate metrics in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: candidate_metrics[]",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "candidate_metrics[]"
  },
  {
    "number": 79,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Mark readiness by sample count",
    "description": "Mark readiness by sample count in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: ready when n>=14",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "ready when n>=14"
  },
  {
    "number": 80,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support single-user experiment design",
    "description": "Support single-user experiment design in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: default_design",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "default_design"
  },
  {
    "number": 81,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Keep experiments reversible metadata",
    "description": "Keep experiments reversible metadata in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: experiments.reversible",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "experiments.reversible"
  },
  {
    "number": 82,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support baseline windows",
    "description": "Support baseline windows in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: baseline_start/baseline_end",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "baseline_start/baseline_end"
  },
  {
    "number": 83,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support test windows",
    "description": "Support test windows in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: test_start/test_end",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "test_start/test_end"
  },
  {
    "number": 84,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support experiment status",
    "description": "Support experiment status in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: experiments.status",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "experiments.status"
  },
  {
    "number": 85,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Avoid unsafe automated interventions",
    "description": "Avoid unsafe automated interventions in the Experiment framework domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: readiness only, no write automation",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "readiness only, no write automation"
  },
  {
    "number": 86,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Build predictive intelligence endpoint",
    "description": "Build predictive intelligence endpoint in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/predictions",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/predictions"
  },
  {
    "number": 87,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Forecast metric direction",
    "description": "Forecast metric direction in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: slope_per_day",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "slope_per_day"
  },
  {
    "number": 88,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Support forecast horizon",
    "description": "Support forecast horizon in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: horizon param",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "horizon param"
  },
  {
    "number": 89,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Support prediction metric filters",
    "description": "Support prediction metric filters in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: metrics param",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "metrics param"
  },
  {
    "number": 90,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Return confidence tier",
    "description": "Return confidence tier in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: confidence low/medium",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "confidence low/medium"
  },
  {
    "number": 91,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Use local historical data only",
    "description": "Use local historical data only in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: observations regression",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "observations regression"
  },
  {
    "number": 92,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Handle insufficient data safely",
    "description": "Handle insufficient data safely in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: omit predictions with n<3",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "omit predictions with n<3"
  },
  {
    "number": 93,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Keep prediction math transparent",
    "description": "Keep prediction math transparent in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: linear regression",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "linear regression"
  },
  {
    "number": 94,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Support configurable history window",
    "description": "Support configurable history window in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: days/to params",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "days/to params"
  },
  {
    "number": 95,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Expose prediction contract",
    "description": "Expose prediction contract in the Predictive intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: docs/API.md",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "docs/API.md"
  },
  {
    "number": 96,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Expose product maturity status",
    "description": "Expose product maturity status in the Product maturity domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/product/status",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/product/status"
  },
  {
    "number": 97,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Report system counts",
    "description": "Report system counts in the Product maturity domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: product/status counts",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "product/status counts"
  },
  {
    "number": 98,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Report architecture invariants",
    "description": "Report architecture invariants in the Product maturity domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: product/status invariants",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "product/status invariants"
  },
  {
    "number": 99,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Track goals 1-100 in Core",
    "description": "Track goals 1-100 in Core in the Product maturity domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: health_goals table",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "health_goals table"
  },
  {
    "number": 100,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Function as Health Intelligence Platform v1",
    "description": "Function as Health Intelligence Platform v1 in the Product maturity domain.",
    "status": "completed",
    "dependencies": [
      1,
      14,
      15,
      26
    ],
    "acceptance_criteria": [
      "Code evidence exists: dashboard + analytics + correlations + experiments + predictions",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "dashboard + analytics + correlations + experiments + predictions"
  },
  {
    "number": 101,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support laboratory results",
    "description": "Support laboratory results in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: lab_results table + lab source + biomarker metric types",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "lab_results table + lab source + biomarker metric types"
  },
  {
    "number": 102,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker registry",
    "description": "Build biomarker registry in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: biomarker_registry + GET /biomarkers/registry",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "biomarker_registry + GET /biomarkers/registry"
  },
  {
    "number": 103,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support reference values",
    "description": "Support reference values in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: biomarker_reference_ranges",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "biomarker_reference_ranges"
  },
  {
    "number": 104,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support age-dependent references",
    "description": "Support age-dependent references in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: age_min/age_max",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "age_min/age_max"
  },
  {
    "number": 105,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support sex-dependent references",
    "description": "Support sex-dependent references in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: sex column + selection logic",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "sex column + selection logic"
  },
  {
    "number": 106,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Visualize biomarker trends",
    "description": "Visualize biomarker trends in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /biomarkers/trends",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /biomarkers/trends"
  },
  {
    "number": 107,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Detect abnormal biomarkers",
    "description": "Detect abnormal biomarkers in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /biomarkers/abnormal",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /biomarkers/abnormal"
  },
  {
    "number": 108,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker dashboards",
    "description": "Build biomarker dashboards in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /biomarkers/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /biomarkers/dashboard"
  },
  {
    "number": 109,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker correlations",
    "description": "Build biomarker correlations in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /biomarkers/correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /biomarkers/correlations"
  },
  {
    "number": 110,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker scorecards",
    "description": "Build biomarker scorecards in the Biomarkers domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /biomarkers/scorecard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /biomarkers/scorecard"
  },
  {
    "number": 111,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support cholesterol analysis",
    "description": "Support cholesterol analysis in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /bloodwork/overview cholesterol panel",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /bloodwork/overview cholesterol panel"
  },
  {
    "number": 112,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support ApoB tracking",
    "description": "Support ApoB tracking in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: blood.apob",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "blood.apob"
  },
  {
    "number": 113,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support glucose tracking",
    "description": "Support glucose tracking in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: blood.glucose",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "blood.glucose"
  },
  {
    "number": 114,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support HbA1c tracking",
    "description": "Support HbA1c tracking in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: blood.hba1c",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "blood.hba1c"
  },
  {
    "number": 115,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support inflammation markers",
    "description": "Support inflammation markers in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: blood.crp",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "blood.crp"
  },
  {
    "number": 116,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support hormone tracking",
    "description": "Support hormone tracking in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: hormone.*",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "hormone.*"
  },
  {
    "number": 117,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support vitamin tracking",
    "description": "Support vitamin tracking in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: blood.vitamin_d",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "blood.vitamin_d"
  },
  {
    "number": 118,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support mineral tracking",
    "description": "Support mineral tracking in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: blood.ferritin",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "blood.ferritin"
  },
  {
    "number": 119,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Build cardiometabolic score",
    "description": "Build cardiometabolic score in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /bloodwork/cardiometabolic",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /bloodwork/cardiometabolic"
  },
  {
    "number": 120,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Build bloodwork overview",
    "description": "Build bloodwork overview in the Bloodwork domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /bloodwork/overview",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /bloodwork/overview"
  },
  {
    "number": 121,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress data model",
    "description": "Build stress data model in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: stress.perceived + score.stress",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "stress.perceived + score.stress"
  },
  {
    "number": 122,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Integrate stress measurements",
    "description": "Integrate stress measurements in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: generic ingest supports stress.perceived",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "generic ingest supports stress.perceived"
  },
  {
    "number": 123,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Analyze stress trends",
    "description": "Analyze stress trends in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/summary",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/summary"
  },
  {
    "number": 124,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Correlate stress and HRV",
    "description": "Correlate stress and HRV in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/summary correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/summary correlations"
  },
  {
    "number": 125,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Correlate stress and sleep",
    "description": "Correlate stress and sleep in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/summary correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/summary correlations"
  },
  {
    "number": 126,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Correlate stress and performance",
    "description": "Correlate stress and performance in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/summary correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/summary correlations"
  },
  {
    "number": 127,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Detect chronic stress",
    "description": "Detect chronic stress in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/alerts",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/alerts"
  },
  {
    "number": 128,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress score",
    "description": "Build stress score in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/summary score",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/summary score"
  },
  {
    "number": 129,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress dashboard",
    "description": "Build stress dashboard in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/dashboard"
  },
  {
    "number": 130,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress warnings",
    "description": "Build stress warnings in the Stress intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /stress/alerts",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /stress/alerts"
  },
  {
    "number": 131,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Support mood tracking",
    "description": "Support mood tracking in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: mood.valence + UI tracking workflow",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "mood.valence + UI tracking workflow"
  },
  {
    "number": 132,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Support energy levels",
    "description": "Support energy levels in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: mood.energy + UI tracking workflow",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "mood.energy + UI tracking workflow"
  },
  {
    "number": 133,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Support motivation tracking",
    "description": "Support motivation tracking in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: mood.motivation + UI tracking workflow",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "mood.motivation + UI tracking workflow"
  },
  {
    "number": 134,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Analyze mood patterns",
    "description": "Analyze mood patterns in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/mood/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/mood/dashboard"
  },
  {
    "number": 135,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Correlate mood and sleep",
    "description": "Correlate mood and sleep in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/mood/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/mood/dashboard correlations"
  },
  {
    "number": 136,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Correlate mood and training",
    "description": "Correlate mood and training in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/mood/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/mood/dashboard correlations"
  },
  {
    "number": 137,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Correlate mood and nutrition",
    "description": "Correlate mood and nutrition in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/mood/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/mood/dashboard correlations"
  },
  {
    "number": 138,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Build mood score",
    "description": "Build mood score in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/mood/dashboard score",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/mood/dashboard score"
  },
  {
    "number": 139,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Build mood dashboard",
    "description": "Build mood dashboard in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/mood/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/mood/dashboard"
  },
  {
    "number": 140,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Build wellbeing trends",
    "description": "Build wellbeing trends in the Mood and wellbeing domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/wellbeing/trends",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/wellbeing/trends"
  },
  {
    "number": 141,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Support symptom registration",
    "description": "Support symptom registration in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: symptom.severity + UI workflow",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "symptom.severity + UI workflow"
  },
  {
    "number": 142,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Support symptom categories",
    "description": "Support symptom categories in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: symptom_categories table",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "symptom_categories table"
  },
  {
    "number": 143,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Support severity scores",
    "description": "Support severity scores in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: symptom.severity",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "symptom.severity"
  },
  {
    "number": 144,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Build symptom timelines",
    "description": "Build symptom timelines in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/symptoms/dashboard timelines",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/symptoms/dashboard timelines"
  },
  {
    "number": 145,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Correlate symptoms and sleep",
    "description": "Correlate symptoms and sleep in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/symptoms/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/symptoms/dashboard correlations"
  },
  {
    "number": 146,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Correlate symptoms and nutrition",
    "description": "Correlate symptoms and nutrition in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/symptoms/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/symptoms/dashboard correlations"
  },
  {
    "number": 147,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Correlate symptoms and training",
    "description": "Correlate symptoms and training in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/symptoms/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/symptoms/dashboard correlations"
  },
  {
    "number": 148,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Detect recurring patterns",
    "description": "Detect recurring patterns in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/symptoms/dashboard recurring_patterns",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/symptoms/dashboard recurring_patterns"
  },
  {
    "number": 149,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Build symptom dashboard",
    "description": "Build symptom dashboard in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/symptoms/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/symptoms/dashboard"
  },
  {
    "number": 150,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Build symptom analyses",
    "description": "Build symptom analyses in the Symptoms domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/symptoms/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/symptoms/dashboard"
  },
  {
    "number": 151,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support body fat percentage",
    "description": "Support body fat percentage in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: body.fat_percent",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "body.fat_percent"
  },
  {
    "number": 152,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support muscle mass",
    "description": "Support muscle mass in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: body.muscle_mass",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "body.muscle_mass"
  },
  {
    "number": 153,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support lean mass",
    "description": "Support lean mass in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: body.lean_mass",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "body.lean_mass"
  },
  {
    "number": 154,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support visceral fat",
    "description": "Support visceral fat in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: body.visceral_fat",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "body.visceral_fat"
  },
  {
    "number": 155,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support body water",
    "description": "Support body water in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: body.water_percent",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "body.water_percent"
  },
  {
    "number": 156,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Build composition trends",
    "description": "Build composition trends in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/body-composition/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/body-composition/dashboard"
  },
  {
    "number": 157,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Analyze recomposition",
    "description": "Analyze recomposition in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/body-composition/dashboard recomposition",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/body-composition/dashboard recomposition"
  },
  {
    "number": 158,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Correlate nutrition and composition",
    "description": "Correlate nutrition and composition in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/body-composition/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/body-composition/dashboard correlations"
  },
  {
    "number": 159,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Correlate training and composition",
    "description": "Correlate training and composition in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/body-composition/dashboard correlations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/body-composition/dashboard correlations"
  },
  {
    "number": 160,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Build body composition dashboard",
    "description": "Build body composition dashboard in the Body composition domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/body-composition/dashboard",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/body-composition/dashboard"
  },
  {
    "number": 161,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze sleep stages",
    "description": "Analyze sleep stages in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: sleep stage metrics + GET /api/v1/sleep/advanced",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "sleep stage metrics + GET /api/v1/sleep/advanced"
  },
  {
    "number": 162,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze sleep consistency",
    "description": "Analyze sleep consistency in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/sleep/advanced consistency",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/sleep/advanced consistency"
  },
  {
    "number": 163,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze bedtime patterns",
    "description": "Analyze bedtime patterns in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: sleep.bedtime",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "sleep.bedtime"
  },
  {
    "number": 164,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze wake times",
    "description": "Analyze wake times in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: sleep.wake_time",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "sleep.wake_time"
  },
  {
    "number": 165,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Detect social jetlag",
    "description": "Detect social jetlag in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/sleep/advanced social_jetlag",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/sleep/advanced social_jetlag"
  },
  {
    "number": 166,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Detect sleep deficits",
    "description": "Detect sleep deficits in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/sleep/advanced deficits",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/sleep/advanced deficits"
  },
  {
    "number": 167,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build sleep debt model",
    "description": "Build sleep debt model in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/sleep/advanced sleep_debt",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/sleep/advanced sleep_debt"
  },
  {
    "number": 168,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build sleep quality score",
    "description": "Build sleep quality score in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/sleep/advanced quality_score",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/sleep/advanced quality_score"
  },
  {
    "number": 169,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build sleep predictions",
    "description": "Build sleep predictions in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/sleep/advanced prediction",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/sleep/advanced prediction"
  },
  {
    "number": 170,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build advanced sleep analyses",
    "description": "Build advanced sleep analyses in the Sleep 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/sleep/advanced",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/sleep/advanced"
  },
  {
    "number": 171,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support micronutrients",
    "description": "Support micronutrients in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.micronutrient_index",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.micronutrient_index"
  },
  {
    "number": 172,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support fiber intake",
    "description": "Support fiber intake in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.fiber",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.fiber"
  },
  {
    "number": 173,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support sodium tracking",
    "description": "Support sodium tracking in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.sodium",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.sodium"
  },
  {
    "number": 174,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support fluid intake",
    "description": "Support fluid intake in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.water",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.water"
  },
  {
    "number": 175,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Analyze meal timing",
    "description": "Analyze meal timing in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: nutrition.meal_timing_score",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "nutrition.meal_timing_score"
  },
  {
    "number": 176,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Analyze food quality",
    "description": "Analyze food quality in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: score.nutrition_quality",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "score.nutrition_quality"
  },
  {
    "number": 177,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Build nutrition scores",
    "description": "Build nutrition scores in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/nutrition/intelligence scores",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/nutrition/intelligence scores"
  },
  {
    "number": 178,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Detect deficiencies",
    "description": "Detect deficiencies in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/nutrition/intelligence deficiencies",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/nutrition/intelligence deficiencies"
  },
  {
    "number": 179,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Detect excesses",
    "description": "Detect excesses in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/nutrition/intelligence excesses",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/nutrition/intelligence excesses"
  },
  {
    "number": 180,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Build nutrition intelligence",
    "description": "Build nutrition intelligence in the Nutrition 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/nutrition/intelligence",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/nutrition/intelligence"
  },
  {
    "number": 181,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery models",
    "description": "Build recovery models in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence"
  },
  {
    "number": 182,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Detect accumulating fatigue",
    "description": "Detect accumulating fatigue in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence fatigue",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence fatigue"
  },
  {
    "number": 183,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Detect insufficient recovery",
    "description": "Detect insufficient recovery in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence warnings",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence warnings"
  },
  {
    "number": 184,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Analyze recovery trends",
    "description": "Analyze recovery trends in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence trends",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence trends"
  },
  {
    "number": 185,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Analyze recovery capacity",
    "description": "Analyze recovery capacity in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence capacity",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence capacity"
  },
  {
    "number": 186,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Predict recovery duration",
    "description": "Predict recovery duration in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence duration",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence duration"
  },
  {
    "number": 187,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery warnings",
    "description": "Build recovery warnings in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence warnings",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence warnings"
  },
  {
    "number": 188,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery reports",
    "description": "Build recovery reports in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence report",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence report"
  },
  {
    "number": 189,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery comparisons",
    "description": "Build recovery comparisons in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/recovery/intelligence comparisons",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/recovery/intelligence comparisons"
  },
  {
    "number": 190,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery intelligence",
    "description": "Build recovery intelligence in the Recovery 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/recovery/intelligence",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/recovery/intelligence"
  },
  {
    "number": 191,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect progression plateaus",
    "description": "Detect progression plateaus in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence plateaus",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence plateaus"
  },
  {
    "number": 192,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect regression",
    "description": "Detect regression in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence regression",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence regression"
  },
  {
    "number": 193,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Analyze training response",
    "description": "Analyze training response in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence response",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence response"
  },
  {
    "number": 194,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Analyze training adaptation",
    "description": "Analyze training adaptation in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence adaptation",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence adaptation"
  },
  {
    "number": 195,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Predict training response",
    "description": "Predict training response in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence prediction",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence prediction"
  },
  {
    "number": 196,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect overtraining",
    "description": "Detect overtraining in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence overtraining",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence overtraining"
  },
  {
    "number": 197,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect underload",
    "description": "Detect underload in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence underload",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence underload"
  },
  {
    "number": 198,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Build training recommendations",
    "description": "Build training recommendations in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence recommendations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence recommendations"
  },
  {
    "number": 199,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Build training intelligence",
    "description": "Build training intelligence in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/training/intelligence",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/training/intelligence"
  },
  {
    "number": 200,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Build training reports",
    "description": "Build training reports in the Training 2.0 domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/training/intelligence report",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/training/intelligence report"
  },
  {
    "number": 201,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Compare years",
    "description": "Compare years in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal year_comparison",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal year_comparison"
  },
  {
    "number": 202,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Analyze seasonal patterns",
    "description": "Analyze seasonal patterns in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal seasonality",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal seasonality"
  },
  {
    "number": 203,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Detect annual trends",
    "description": "Detect annual trends in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal annual_trends",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal annual_trends"
  },
  {
    "number": 204,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Detect recurring cycles",
    "description": "Detect recurring cycles in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal cycles",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal cycles"
  },
  {
    "number": 205,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build long-term dashboards",
    "description": "Build long-term dashboards in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/longitudinal",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/longitudinal"
  },
  {
    "number": 206,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build health milestones",
    "description": "Build health milestones in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: api/lib/milestones.js + scripts/detect-milestones.mjs + GET/POST /api/v1/milestones + UI trends milestones",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "api/lib/milestones.js + scripts/detect-milestones.mjs + GET/POST /api/v1/milestones + UI trends milestones"
  },
  {
    "number": 207,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build historical comparisons",
    "description": "Build historical comparisons in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal comparisons",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal comparisons"
  },
  {
    "number": 208,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build life-course analyses",
    "description": "Build life-course analyses in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal life_course",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal life_course"
  },
  {
    "number": 209,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build trend projections",
    "description": "Build trend projections in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/longitudinal projections",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/longitudinal projections"
  },
  {
    "number": 210,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build longitudinal intelligence",
    "description": "Build longitudinal intelligence in the Longitudinal intelligence domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/longitudinal",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/longitudinal"
  },
  {
    "number": 211,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal HRV baseline",
    "description": "Calculate personal HRV baseline in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines heart.hrv_sdnn",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines heart.hrv_sdnn"
  },
  {
    "number": 212,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal sleep baseline",
    "description": "Calculate personal sleep baseline in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines sleep.duration",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines sleep.duration"
  },
  {
    "number": 213,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal weight baseline",
    "description": "Calculate personal weight baseline in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines body.weight",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines body.weight"
  },
  {
    "number": 214,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal recovery baseline",
    "description": "Calculate personal recovery baseline in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines recovery",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines recovery"
  },
  {
    "number": 215,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal training baseline",
    "description": "Calculate personal training baseline in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines training",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines training"
  },
  {
    "number": 216,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Detect deviations from baseline",
    "description": "Detect deviations from baseline in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines deviations",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines deviations"
  },
  {
    "number": 217,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Build baseline dashboards",
    "description": "Build baseline dashboards in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/baselines",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/baselines"
  },
  {
    "number": 218,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Build baseline alerts",
    "description": "Build baseline alerts in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines alerts",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines alerts"
  },
  {
    "number": 219,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Build baseline trends",
    "description": "Build baseline trends in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/baselines trends",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/baselines trends"
  },
  {
    "number": 220,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Make personal baselines primary",
    "description": "Make personal baselines primary in the Personal baselines domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: risk/insight engines use personal baselines",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "risk/insight engines use personal baselines"
  },
  {
    "number": 221,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect abnormal trends",
    "description": "Detect abnormal trends in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks abnormal_trends",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks abnormal_trends"
  },
  {
    "number": 222,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect sudden changes",
    "description": "Detect sudden changes in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks sudden_changes",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks sudden_changes"
  },
  {
    "number": 223,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect long-term deterioration",
    "description": "Detect long-term deterioration in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks deterioration",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks deterioration"
  },
  {
    "number": 224,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect recovery problems",
    "description": "Detect recovery problems in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks recovery",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks recovery"
  },
  {
    "number": 225,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect sleep deterioration",
    "description": "Detect sleep deterioration in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks sleep",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks sleep"
  },
  {
    "number": 226,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect cardiovascular signals",
    "description": "Detect cardiovascular signals in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks cardiovascular",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks cardiovascular"
  },
  {
    "number": 227,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect metabolic signals",
    "description": "Detect metabolic signals in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks metabolic",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks metabolic"
  },
  {
    "number": 228,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Build risk indicators",
    "description": "Build risk indicators in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks indicators",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks indicators"
  },
  {
    "number": 229,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Build risk dashboard",
    "description": "Build risk dashboard in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/risks",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/risks"
  },
  {
    "number": 230,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Build early warnings",
    "description": "Build early warnings in the Risk detection domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/risks early_warnings",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/risks early_warnings"
  },
  {
    "number": 231,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Generate automatic insights",
    "description": "Generate automatic insights in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/insights",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/insights"
  },
  {
    "number": 232,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Prioritize insights",
    "description": "Prioritize insights in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/insights sorted by priority",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/insights sorted by priority"
  },
  {
    "number": 233,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Rank insights by impact",
    "description": "Rank insights by impact in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: impact field",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "impact field"
  },
  {
    "number": 234,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Rank insights by confidence",
    "description": "Rank insights by confidence in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: confidence field",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "confidence field"
  },
  {
    "number": 235,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Show evidence per insight",
    "description": "Show evidence per insight in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: evidence field",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "evidence field"
  },
  {
    "number": 236,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Show source data per insight",
    "description": "Show source data per insight in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: source_data field",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "source_data field"
  },
  {
    "number": 237,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Show uncertainty",
    "description": "Show uncertainty in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: uncertainty field",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "uncertainty field"
  },
  {
    "number": 238,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Build insight timeline",
    "description": "Build insight timeline in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /api/v1/insights/timeline",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /api/v1/insights/timeline"
  },
  {
    "number": 239,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Build insight history",
    "description": "Build insight history in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: insight_events + GET /api/v1/insights/history",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "insight_events + GET /api/v1/insights/history"
  },
  {
    "number": 240,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Build central insights hub",
    "description": "Build central insights hub in the Insights engine domain.",
    "status": "completed",
    "dependencies": [
      1,
      12,
      26,
      66,
      86
    ],
    "acceptance_criteria": [
      "Code evidence exists: UI + GET /api/v1/insights",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "UI + GET /api/v1/insights"
  },
  {
    "number": 241,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build daily briefing",
    "description": "Build daily briefing in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /briefing/daily",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /briefing/daily"
  },
  {
    "number": 242,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build weekly briefing",
    "description": "Build weekly briefing in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /briefing/weekly",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /briefing/weekly"
  },
  {
    "number": 243,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build monthly briefing",
    "description": "Build monthly briefing in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /briefing/monthly",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /briefing/monthly"
  },
  {
    "number": 244,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build quarterly reports",
    "description": "Build quarterly reports in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /briefing/quarterly",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /briefing/quarterly"
  },
  {
    "number": 245,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build yearly overviews",
    "description": "Build yearly overviews in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /briefing/yearly",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /briefing/yearly"
  },
  {
    "number": 246,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build personal health profiles",
    "description": "Build personal health profiles in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /health-profile",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /health-profile"
  },
  {
    "number": 247,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build health goals",
    "description": "Build health goals in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /health-goals",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /health-goals"
  },
  {
    "number": 248,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build progress monitoring",
    "description": "Build progress monitoring in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /progress",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /progress"
  },
  {
    "number": 249,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build decision support",
    "description": "Build decision support in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /decision-support",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /decision-support"
  },
  {
    "number": 250,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Function as personal Health Operating System",
    "description": "Function as personal Health Operating System in the Health OS briefings domain.",
    "status": "completed",
    "dependencies": [
      26,
      96,
      231
    ],
    "acceptance_criteria": [
      "Code evidence exists: GET /operating-system",
      "Behavior is reachable through API, UI, migration or ingest path as applicable.",
      "Tests or audit evidence cover the contract before future status upgrades."
    ],
    "evidence": "GET /operating-system"
  }
]
```
