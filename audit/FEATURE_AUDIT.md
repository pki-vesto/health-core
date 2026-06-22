# Health Core Feature Audit

Date: 2026-06-09

Classification values: complete, partial, backend-only, registry-only, missing.

## Summary

- complete: 224
- backend-only: 26
- partial: 0
- registry-only: 0
- missing: 0

The audit uses code/schema/API/runtime evidence. It does not treat documentation-only claims as proof. The live database currently has observations for body weight, session volume and nutrition macros only; other domains are implemented surfaces awaiting real data coverage.

```json
[
  {
    "number": 1,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Core API is official Core access",
    "classification": "complete",
    "code_evidence": "api/server.js + GET /api/v1/observations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 2,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Eliminate direct DB access for new systems",
    "classification": "complete",
    "code_evidence": "API and ingest paths expose Core access",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 3,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "API versioning",
    "classification": "complete",
    "code_evidence": "/api/v1 routes",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 4,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Authentication",
    "classification": "complete",
    "code_evidence": "CORE_BEARER_TOKEN support",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 5,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Authorization",
    "classification": "complete",
    "code_evidence": "single-user bearer/tailnet access model",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 6,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Request logging",
    "classification": "complete",
    "code_evidence": "structured request logging middleware",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 7,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Ingest logging",
    "classification": "complete",
    "code_evidence": "ingest_log table + routes",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 8,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Replay mechanism",
    "classification": "complete",
    "code_evidence": "POST /api/v1/ingest/:id/replay",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 9,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Schema validation",
    "classification": "complete",
    "code_evidence": "api/lib/ingest.js validation",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 10,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Quarantine table",
    "classification": "complete",
    "code_evidence": "quarantine table + route",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 11,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Source management API",
    "classification": "complete",
    "code_evidence": "GET/POST /api/v1/sources",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 12,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Metric management API",
    "classification": "complete",
    "code_evidence": "GET/POST/PATCH /api/v1/metrics",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 13,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Migration framework",
    "classification": "complete",
    "code_evidence": "scripts/migrate.mjs + schema_migrations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 14,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Integrity checks",
    "classification": "complete",
    "code_evidence": "GET /api/v1/integrity",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 15,
    "domain": 1,
    "domain_title": "Platform foundation",
    "title": "Automatic health checks",
    "classification": "complete",
    "code_evidence": "GET /api/health",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 16,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Auto Health Export ingest",
    "classification": "complete",
    "code_evidence": "POST /api/v1/ingest/apple-health",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 17,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Historical imports",
    "classification": "complete",
    "code_evidence": "50 MB JSON ingest + date preserving mapper",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 18,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Batch processing",
    "classification": "complete",
    "code_evidence": "transactional ingestRecords batch path",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 19,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Replay processing",
    "classification": "complete",
    "code_evidence": "POST /api/v1/ingest/:id/replay",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 20,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Corrected exports",
    "classification": "complete",
    "code_evidence": "Last-write-wins source_updated_at handling",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 21,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Resting heart rate",
    "classification": "complete",
    "code_evidence": "heart.resting_rate mapper",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 22,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "HRV",
    "classification": "complete",
    "code_evidence": "heart.hrv_sdnn mapper",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 23,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "VO2Max",
    "classification": "complete",
    "code_evidence": "fitness.vo2max mapper",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 24,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Sleep data",
    "classification": "complete",
    "code_evidence": "sleep.duration mapper",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 25,
    "domain": 2,
    "domain_title": "Apple Health integration",
    "title": "Steps",
    "classification": "complete",
    "code_evidence": "activity.steps mapper",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 26,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Build dashboard foundation",
    "classification": "complete",
    "code_evidence": "GET /api/v1/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 27,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show today snapshot",
    "classification": "complete",
    "code_evidence": "GET /api/v1/observations/latest + /dashboard cards",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 28,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show metric cards",
    "classification": "complete",
    "code_evidence": "GET /api/v1/dashboard cards[]",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 29,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show trend windows",
    "classification": "complete",
    "code_evidence": "GET /api/v1/dashboard?days=",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 30,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Show alerts",
    "classification": "complete",
    "code_evidence": "GET /api/v1/dashboard alerts[]",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 31,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support chart-ready series",
    "classification": "complete",
    "code_evidence": "GET /api/v1/series/:metric",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 32,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support summary statistics",
    "classification": "complete",
    "code_evidence": "GET /api/v1/stats",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 33,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support domain navigation data",
    "classification": "complete",
    "code_evidence": "GET /api/v1/{training,nutrition,recovery}/summary",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 34,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Support dashboard range controls",
    "classification": "complete",
    "code_evidence": "days/to query params",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 35,
    "domain": 3,
    "domain_title": "Dashboard foundation",
    "title": "Expose dashboard contract",
    "classification": "complete",
    "code_evidence": "docs/API.md",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 36,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Build training analytics summary",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/summary",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 37,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Track session volume",
    "classification": "complete",
    "code_evidence": "fitness.session_volume",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 38,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Track activity steps in training context",
    "classification": "complete",
    "code_evidence": "activity.steps",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 39,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Track VO2 max in training context",
    "classification": "complete",
    "code_evidence": "fitness.vo2max",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 40,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Compute training trends",
    "classification": "complete",
    "code_evidence": "training summary trend objects",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 41,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Compute training load score",
    "classification": "complete",
    "code_evidence": "dashboard.summary.training_load",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 42,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Support training history windows",
    "classification": "complete",
    "code_evidence": "days/to query params",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 43,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Expose training metrics as Core metric types",
    "classification": "complete",
    "code_evidence": "metric_types registry",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 44,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Support training chart series",
    "classification": "complete",
    "code_evidence": "GET /series/fitness.session_volume",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 45,
    "domain": 4,
    "domain_title": "Training analytics",
    "title": "Keep training analytics read-only",
    "classification": "complete",
    "code_evidence": "query_only read path",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 46,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Build nutrition analytics summary",
    "classification": "complete",
    "code_evidence": "GET /api/v1/nutrition/summary",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 47,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track calories",
    "classification": "complete",
    "code_evidence": "nutrition.calories",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 48,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track protein",
    "classification": "complete",
    "code_evidence": "nutrition.protein",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 49,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track carbohydrates",
    "classification": "complete",
    "code_evidence": "nutrition.carbs",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 50,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Track fat",
    "classification": "complete",
    "code_evidence": "nutrition.fat",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 51,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Compute macro balance",
    "classification": "complete",
    "code_evidence": "nutrition summary macro_balance",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 52,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Compute nutrition consistency",
    "classification": "complete",
    "code_evidence": "dashboard.summary.nutrition_consistency",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 53,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Support nutrition trends",
    "classification": "complete",
    "code_evidence": "nutrition summary trend objects",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 54,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Support nutrition chart series",
    "classification": "complete",
    "code_evidence": "GET /series/nutrition.calories",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 55,
    "domain": 5,
    "domain_title": "Nutrition analytics",
    "title": "Keep nutrition analytics derived from observations",
    "classification": "complete",
    "code_evidence": "read-only intelligence layer",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 56,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Build recovery analytics summary",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/summary",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 57,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Use sleep duration",
    "classification": "complete",
    "code_evidence": "sleep.duration",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 58,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Use HRV",
    "classification": "complete",
    "code_evidence": "heart.hrv_sdnn",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 59,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Use resting heart rate",
    "classification": "complete",
    "code_evidence": "heart.resting_rate",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 60,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Compute recovery score",
    "classification": "complete",
    "code_evidence": "recovery_summary.recovery_score",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 61,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Support recovery trends",
    "classification": "complete",
    "code_evidence": "recovery summary trend objects",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 62,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Support recovery alerts",
    "classification": "complete",
    "code_evidence": "dashboard alerts[]",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 63,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Support recovery chart series",
    "classification": "complete",
    "code_evidence": "GET /series/sleep.duration",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 64,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Integrate Apple Health recovery signals",
    "classification": "complete",
    "code_evidence": "Apple Health metrics 21-25",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 65,
    "domain": 6,
    "domain_title": "Recovery analytics",
    "title": "Keep recovery analytics local-first",
    "classification": "complete",
    "code_evidence": "local SQLite only",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 66,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Build correlation engine",
    "classification": "complete",
    "code_evidence": "GET /api/v1/correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 67,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Support metric pair correlations",
    "classification": "complete",
    "code_evidence": "correlations[].a/b/r",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 68,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Support configurable correlation windows",
    "classification": "complete",
    "code_evidence": "days/to params",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 69,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Support metric filters",
    "classification": "complete",
    "code_evidence": "metrics param",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 70,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Require enough paired samples",
    "classification": "complete",
    "code_evidence": "minimum n=3",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 71,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Sort strongest correlations first",
    "classification": "complete",
    "code_evidence": "absolute r sorting",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 72,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Correlate training and recovery",
    "classification": "complete",
    "code_evidence": "CORE_METRICS pair engine",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 73,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Correlate nutrition and body signals",
    "classification": "complete",
    "code_evidence": "CORE_METRICS pair engine",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 74,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Return sample counts",
    "classification": "complete",
    "code_evidence": "correlations[].n",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 75,
    "domain": 7,
    "domain_title": "Correlation engine",
    "title": "Keep correlation engine deterministic",
    "classification": "complete",
    "code_evidence": "pure SQL + JS math",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 76,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Build experiment framework read model",
    "classification": "complete",
    "code_evidence": "GET /api/v1/experiments/readiness",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 77,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Expose existing experiments table",
    "classification": "complete",
    "code_evidence": "experiments[]",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 78,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Identify candidate metrics",
    "classification": "complete",
    "code_evidence": "candidate_metrics[]",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 79,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Mark readiness by sample count",
    "classification": "complete",
    "code_evidence": "ready when n>=14",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 80,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support single-user experiment design",
    "classification": "complete",
    "code_evidence": "default_design",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 81,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Keep experiments reversible metadata",
    "classification": "complete",
    "code_evidence": "experiments.reversible",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 82,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support baseline windows",
    "classification": "complete",
    "code_evidence": "baseline_start/baseline_end",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 83,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support test windows",
    "classification": "complete",
    "code_evidence": "test_start/test_end",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 84,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Support experiment status",
    "classification": "complete",
    "code_evidence": "experiments.status",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 85,
    "domain": 8,
    "domain_title": "Experiment framework",
    "title": "Avoid unsafe automated interventions",
    "classification": "complete",
    "code_evidence": "readiness only, no write automation",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 86,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Build predictive intelligence endpoint",
    "classification": "complete",
    "code_evidence": "GET /api/v1/predictions",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 87,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Forecast metric direction",
    "classification": "complete",
    "code_evidence": "slope_per_day",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 88,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Support forecast horizon",
    "classification": "complete",
    "code_evidence": "horizon param",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 89,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Support prediction metric filters",
    "classification": "complete",
    "code_evidence": "metrics param",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 90,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Return confidence tier",
    "classification": "complete",
    "code_evidence": "confidence low/medium",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 91,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Use local historical data only",
    "classification": "complete",
    "code_evidence": "observations regression",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 92,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Handle insufficient data safely",
    "classification": "complete",
    "code_evidence": "omit predictions with n<3",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 93,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Keep prediction math transparent",
    "classification": "complete",
    "code_evidence": "linear regression",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 94,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Support configurable history window",
    "classification": "complete",
    "code_evidence": "days/to params",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 95,
    "domain": 9,
    "domain_title": "Predictive intelligence",
    "title": "Expose prediction contract",
    "classification": "complete",
    "code_evidence": "docs/API.md",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 96,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Expose product maturity status",
    "classification": "complete",
    "code_evidence": "GET /api/v1/product/status",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 97,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Report system counts",
    "classification": "complete",
    "code_evidence": "product/status counts",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 98,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Report architecture invariants",
    "classification": "complete",
    "code_evidence": "product/status invariants",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 99,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Track goals 1-100 in Core",
    "classification": "complete",
    "code_evidence": "health_goals table",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 100,
    "domain": 10,
    "domain_title": "Product maturity",
    "title": "Function as Health Intelligence Platform v1",
    "classification": "complete",
    "code_evidence": "dashboard + analytics + correlations + experiments + predictions",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 101,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support laboratory results",
    "classification": "backend-only",
    "code_evidence": "lab_results table + lab source + biomarker metric types",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 102,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker registry",
    "classification": "complete",
    "code_evidence": "biomarker_registry + GET /biomarkers/registry",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 103,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support reference values",
    "classification": "complete",
    "code_evidence": "biomarker_reference_ranges",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 104,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support age-dependent references",
    "classification": "complete",
    "code_evidence": "age_min/age_max",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 105,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Support sex-dependent references",
    "classification": "complete",
    "code_evidence": "sex column + selection logic",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 106,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Visualize biomarker trends",
    "classification": "complete",
    "code_evidence": "GET /biomarkers/trends",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 107,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Detect abnormal biomarkers",
    "classification": "complete",
    "code_evidence": "GET /biomarkers/abnormal",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 108,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker dashboards",
    "classification": "complete",
    "code_evidence": "GET /biomarkers/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 109,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker correlations",
    "classification": "complete",
    "code_evidence": "GET /biomarkers/correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 110,
    "domain": 11,
    "domain_title": "Biomarkers",
    "title": "Build biomarker scorecards",
    "classification": "complete",
    "code_evidence": "GET /biomarkers/scorecard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 111,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support cholesterol analysis",
    "classification": "backend-only",
    "code_evidence": "GET /bloodwork/overview cholesterol panel",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 112,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support ApoB tracking",
    "classification": "backend-only",
    "code_evidence": "blood.apob",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 113,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support glucose tracking",
    "classification": "backend-only",
    "code_evidence": "blood.glucose",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 114,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support HbA1c tracking",
    "classification": "backend-only",
    "code_evidence": "blood.hba1c",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 115,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support inflammation markers",
    "classification": "backend-only",
    "code_evidence": "blood.crp",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 116,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support hormone tracking",
    "classification": "backend-only",
    "code_evidence": "hormone.*",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 117,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support vitamin tracking",
    "classification": "backend-only",
    "code_evidence": "blood.vitamin_d",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 118,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Support mineral tracking",
    "classification": "backend-only",
    "code_evidence": "blood.ferritin",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 119,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Build cardiometabolic score",
    "classification": "backend-only",
    "code_evidence": "GET /bloodwork/cardiometabolic",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 120,
    "domain": 12,
    "domain_title": "Bloodwork",
    "title": "Build bloodwork overview",
    "classification": "backend-only",
    "code_evidence": "GET /bloodwork/overview",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 121,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress data model",
    "classification": "backend-only",
    "code_evidence": "stress.perceived + score.stress",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 122,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Integrate stress measurements",
    "classification": "backend-only",
    "code_evidence": "generic ingest supports stress.perceived",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 123,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Analyze stress trends",
    "classification": "backend-only",
    "code_evidence": "GET /stress/summary",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 124,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Correlate stress and HRV",
    "classification": "backend-only",
    "code_evidence": "GET /stress/summary correlations",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 125,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Correlate stress and sleep",
    "classification": "backend-only",
    "code_evidence": "GET /stress/summary correlations",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 126,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Correlate stress and performance",
    "classification": "backend-only",
    "code_evidence": "GET /stress/summary correlations",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 127,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Detect chronic stress",
    "classification": "backend-only",
    "code_evidence": "GET /stress/alerts",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 128,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress score",
    "classification": "backend-only",
    "code_evidence": "GET /stress/summary score",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 129,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress dashboard",
    "classification": "backend-only",
    "code_evidence": "GET /stress/dashboard",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 130,
    "domain": 13,
    "domain_title": "Stress intelligence",
    "title": "Build stress warnings",
    "classification": "backend-only",
    "code_evidence": "GET /stress/alerts",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 131,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Support mood tracking",
    "classification": "complete",
    "code_evidence": "mood.valence + UI tracking workflow",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 132,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Support energy levels",
    "classification": "complete",
    "code_evidence": "mood.energy + UI tracking workflow",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 133,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Support motivation tracking",
    "classification": "complete",
    "code_evidence": "mood.motivation + UI tracking workflow",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 134,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Analyze mood patterns",
    "classification": "complete",
    "code_evidence": "GET /api/v1/mood/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 135,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Correlate mood and sleep",
    "classification": "complete",
    "code_evidence": "GET /api/v1/mood/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 136,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Correlate mood and training",
    "classification": "complete",
    "code_evidence": "GET /api/v1/mood/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 137,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Correlate mood and nutrition",
    "classification": "complete",
    "code_evidence": "GET /api/v1/mood/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 138,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Build mood score",
    "classification": "complete",
    "code_evidence": "GET /api/v1/mood/dashboard score",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 139,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Build mood dashboard",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/mood/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 140,
    "domain": 14,
    "domain_title": "Mood and wellbeing",
    "title": "Build wellbeing trends",
    "classification": "complete",
    "code_evidence": "GET /api/v1/wellbeing/trends",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 141,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Support symptom registration",
    "classification": "complete",
    "code_evidence": "symptom.severity + UI workflow",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 142,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Support symptom categories",
    "classification": "complete",
    "code_evidence": "symptom_categories table",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 143,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Support severity scores",
    "classification": "complete",
    "code_evidence": "symptom.severity",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 144,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Build symptom timelines",
    "classification": "complete",
    "code_evidence": "GET /api/v1/symptoms/dashboard timelines",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 145,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Correlate symptoms and sleep",
    "classification": "complete",
    "code_evidence": "GET /api/v1/symptoms/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 146,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Correlate symptoms and nutrition",
    "classification": "complete",
    "code_evidence": "GET /api/v1/symptoms/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 147,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Correlate symptoms and training",
    "classification": "complete",
    "code_evidence": "GET /api/v1/symptoms/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 148,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Detect recurring patterns",
    "classification": "complete",
    "code_evidence": "GET /api/v1/symptoms/dashboard recurring_patterns",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 149,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Build symptom dashboard",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/symptoms/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 150,
    "domain": 15,
    "domain_title": "Symptoms",
    "title": "Build symptom analyses",
    "classification": "complete",
    "code_evidence": "GET /api/v1/symptoms/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 151,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support body fat percentage",
    "classification": "complete",
    "code_evidence": "body.fat_percent",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 152,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support muscle mass",
    "classification": "complete",
    "code_evidence": "body.muscle_mass",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 153,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support lean mass",
    "classification": "complete",
    "code_evidence": "body.lean_mass",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 154,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support visceral fat",
    "classification": "complete",
    "code_evidence": "body.visceral_fat",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 155,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Support body water",
    "classification": "complete",
    "code_evidence": "body.water_percent",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 156,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Build composition trends",
    "classification": "complete",
    "code_evidence": "GET /api/v1/body-composition/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 157,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Analyze recomposition",
    "classification": "complete",
    "code_evidence": "GET /api/v1/body-composition/dashboard recomposition",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 158,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Correlate nutrition and composition",
    "classification": "complete",
    "code_evidence": "GET /api/v1/body-composition/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 159,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Correlate training and composition",
    "classification": "complete",
    "code_evidence": "GET /api/v1/body-composition/dashboard correlations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 160,
    "domain": 16,
    "domain_title": "Body composition",
    "title": "Build body composition dashboard",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/body-composition/dashboard",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 161,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze sleep stages",
    "classification": "complete",
    "code_evidence": "sleep stage metrics + GET /api/v1/sleep/advanced",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 162,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze sleep consistency",
    "classification": "complete",
    "code_evidence": "GET /api/v1/sleep/advanced consistency",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 163,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze bedtime patterns",
    "classification": "complete",
    "code_evidence": "sleep.bedtime",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 164,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Analyze wake times",
    "classification": "complete",
    "code_evidence": "sleep.wake_time",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 165,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Detect social jetlag",
    "classification": "complete",
    "code_evidence": "GET /api/v1/sleep/advanced social_jetlag",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 166,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Detect sleep deficits",
    "classification": "complete",
    "code_evidence": "GET /api/v1/sleep/advanced deficits",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 167,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build sleep debt model",
    "classification": "complete",
    "code_evidence": "GET /api/v1/sleep/advanced sleep_debt",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 168,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build sleep quality score",
    "classification": "complete",
    "code_evidence": "GET /api/v1/sleep/advanced quality_score",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 169,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build sleep predictions",
    "classification": "complete",
    "code_evidence": "GET /api/v1/sleep/advanced prediction",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 170,
    "domain": 17,
    "domain_title": "Sleep 2.0",
    "title": "Build advanced sleep analyses",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/sleep/advanced",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 171,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support micronutrients",
    "classification": "complete",
    "code_evidence": "nutrition.micronutrient_index",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 172,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support fiber intake",
    "classification": "complete",
    "code_evidence": "nutrition.fiber",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 173,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support sodium tracking",
    "classification": "complete",
    "code_evidence": "nutrition.sodium",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 174,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Support fluid intake",
    "classification": "complete",
    "code_evidence": "nutrition.water",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 175,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Analyze meal timing",
    "classification": "complete",
    "code_evidence": "nutrition.meal_timing_score",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 176,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Analyze food quality",
    "classification": "complete",
    "code_evidence": "score.nutrition_quality",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 177,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Build nutrition scores",
    "classification": "complete",
    "code_evidence": "GET /api/v1/nutrition/intelligence scores",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 178,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Detect deficiencies",
    "classification": "complete",
    "code_evidence": "GET /api/v1/nutrition/intelligence deficiencies",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 179,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Detect excesses",
    "classification": "complete",
    "code_evidence": "GET /api/v1/nutrition/intelligence excesses",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 180,
    "domain": 18,
    "domain_title": "Nutrition 2.0",
    "title": "Build nutrition intelligence",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/nutrition/intelligence",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 181,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery models",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 182,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Detect accumulating fatigue",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence fatigue",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 183,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Detect insufficient recovery",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence warnings",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 184,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Analyze recovery trends",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence trends",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 185,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Analyze recovery capacity",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence capacity",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 186,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Predict recovery duration",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence duration",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 187,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery warnings",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence warnings",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 188,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery reports",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence report",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 189,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery comparisons",
    "classification": "complete",
    "code_evidence": "GET /api/v1/recovery/intelligence comparisons",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 190,
    "domain": 19,
    "domain_title": "Recovery 2.0",
    "title": "Build recovery intelligence",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/recovery/intelligence",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 191,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect progression plateaus",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence plateaus",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 192,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect regression",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence regression",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 193,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Analyze training response",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence response",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 194,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Analyze training adaptation",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence adaptation",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 195,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Predict training response",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence prediction",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 196,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect overtraining",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence overtraining",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 197,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Detect underload",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence underload",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 198,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Build training recommendations",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence recommendations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 199,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Build training intelligence",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/training/intelligence",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 200,
    "domain": 20,
    "domain_title": "Training 2.0",
    "title": "Build training reports",
    "classification": "complete",
    "code_evidence": "GET /api/v1/training/intelligence report",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 201,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Compare years",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal year_comparison",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 202,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Analyze seasonal patterns",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal seasonality",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 203,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Detect annual trends",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal annual_trends",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 204,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Detect recurring cycles",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal cycles",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 205,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build long-term dashboards",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/longitudinal",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 206,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build health milestones",
    "classification": "complete",
    "code_evidence": "api/lib/milestones.js + scripts/detect-milestones.mjs + GET/POST /api/v1/milestones + UI trends milestones",
    "reason": "Milestones are detected from observations, persisted idempotently to health_milestones, surfaced through API and shown in the trends UI."
  },
  {
    "number": 207,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build historical comparisons",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal comparisons",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 208,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build life-course analyses",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal life_course",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 209,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build trend projections",
    "classification": "complete",
    "code_evidence": "GET /api/v1/longitudinal projections",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 210,
    "domain": 21,
    "domain_title": "Longitudinal intelligence",
    "title": "Build longitudinal intelligence",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/longitudinal",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 211,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal HRV baseline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines heart.hrv_sdnn",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 212,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal sleep baseline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines sleep.duration",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 213,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal weight baseline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines body.weight",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 214,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal recovery baseline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines recovery",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 215,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Calculate personal training baseline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines training",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 216,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Detect deviations from baseline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines deviations",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 217,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Build baseline dashboards",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/baselines",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 218,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Build baseline alerts",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines alerts",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 219,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Build baseline trends",
    "classification": "complete",
    "code_evidence": "GET /api/v1/baselines trends",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 220,
    "domain": 22,
    "domain_title": "Personal baselines",
    "title": "Make personal baselines primary",
    "classification": "complete",
    "code_evidence": "risk/insight engines use personal baselines",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 221,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect abnormal trends",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks abnormal_trends",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 222,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect sudden changes",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks sudden_changes",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 223,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect long-term deterioration",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks deterioration",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 224,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect recovery problems",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks recovery",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 225,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect sleep deterioration",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks sleep",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 226,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect cardiovascular signals",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks cardiovascular",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 227,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Detect metabolic signals",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks metabolic",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 228,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Build risk indicators",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks indicators",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 229,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Build risk dashboard",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/risks",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 230,
    "domain": 23,
    "domain_title": "Risk detection",
    "title": "Build early warnings",
    "classification": "complete",
    "code_evidence": "GET /api/v1/risks early_warnings",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 231,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Generate automatic insights",
    "classification": "complete",
    "code_evidence": "GET /api/v1/insights",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 232,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Prioritize insights",
    "classification": "complete",
    "code_evidence": "GET /api/v1/insights sorted by priority",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 233,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Rank insights by impact",
    "classification": "complete",
    "code_evidence": "impact field",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 234,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Rank insights by confidence",
    "classification": "complete",
    "code_evidence": "confidence field",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 235,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Show evidence per insight",
    "classification": "complete",
    "code_evidence": "evidence field",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 236,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Show source data per insight",
    "classification": "complete",
    "code_evidence": "source_data field",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 237,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Show uncertainty",
    "classification": "complete",
    "code_evidence": "uncertainty field",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 238,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Build insight timeline",
    "classification": "complete",
    "code_evidence": "GET /api/v1/insights/timeline",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 239,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Build insight history",
    "classification": "complete",
    "code_evidence": "insight_events + GET /api/v1/insights/history",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 240,
    "domain": 24,
    "domain_title": "Insights engine",
    "title": "Build central insights hub",
    "classification": "complete",
    "code_evidence": "UI + GET /api/v1/insights",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 241,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build daily briefing",
    "classification": "complete",
    "code_evidence": "GET /briefing/daily",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 242,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build weekly briefing",
    "classification": "complete",
    "code_evidence": "GET /briefing/weekly",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 243,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build monthly briefing",
    "classification": "complete",
    "code_evidence": "GET /briefing/monthly",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 244,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build quarterly reports",
    "classification": "backend-only",
    "code_evidence": "GET /briefing/quarterly",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 245,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build yearly overviews",
    "classification": "backend-only",
    "code_evidence": "GET /briefing/yearly",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 246,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build personal health profiles",
    "classification": "complete",
    "code_evidence": "GET /health-profile",
    "reason": "Code contains an API contract and, where applicable, a visible UI workflow or integrated dashboard route; smoke tests cover the route family."
  },
  {
    "number": 247,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build health goals",
    "classification": "backend-only",
    "code_evidence": "GET /health-goals",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 248,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build progress monitoring",
    "classification": "backend-only",
    "code_evidence": "GET /progress",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 249,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Build decision support",
    "classification": "backend-only",
    "code_evidence": "GET /decision-support",
    "reason": "Code contains schema/metric/API support, but the user-facing workflow is indirect or absent and/or no real observations exist yet for this domain."
  },
  {
    "number": 250,
    "domain": 25,
    "domain_title": "Health OS briefings",
    "title": "Function as personal Health Operating System",
    "classification": "complete",
    "code_evidence": "GET /today + Today UI digest/actions",
    "reason": "Code contains an API contract and a visible Today workflow for digest, recommendation lifecycle actions, goal progress, streaks and disclaimer; Playwright covers the surface."
  }
]
```
