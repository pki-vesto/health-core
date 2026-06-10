# Health Core Architecture

Date: 2026-06-09

## Component Relationship

`Shred / Apple Health / manual UI / future lab imports` -> `/api/v1/ingest*` -> `validation + quarantine + ingest_log` -> `SQLite core.db observations` -> `read-only API` -> `intelligence modules` -> `browser UI and reports`.

## Database

SQLite `data/core.db` is the Core. Tables currently present: `biomarker_reference_ranges`, `biomarker_registry`, `derived_metrics`, `experiments`, `health_goals`, `health_milestones`, `ingest_log`, `insight_events`, `lab_results`, `metric_types`, `observations`, `quarantine`, `schema_migrations`, `sources`, `symptom_categories`.

The canonical table is `observations`; registries include `sources`, `metric_types`, `health_goals`, `biomarker_registry`, `biomarker_reference_ranges` and `symptom_categories`. Audit and operational tables include `ingest_log`, `quarantine`, `schema_migrations`, `experiments`, `insight_events`, `health_milestones` and `lab_results`.

Active metric count: 62. Sources: apple_health (device), health_core (module), lab (lab), manual (user), shred (module).

Live observation coverage on 2026-06-09: body.weight: 2 rows (2026-06-04..2026-06-07); fitness.session_volume: 3 rows (2026-06-04..2026-06-08); nutrition.calories: 9 rows (2026-06-01..2026-06-09); nutrition.carbs: 9 rows (2026-06-01..2026-06-09); nutrition.fat: 9 rows (2026-06-01..2026-06-09); nutrition.protein: 9 rows (2026-06-01..2026-06-09). This means many implemented domains are schema/API/UI-ready but not yet populated with real observations.

## API

The API is an Express service in `api/`. `api/server.js` serves the static UI, request logging, optional bearer auth and `/api/v1`. `api/db.js` separates read-only `db()` with `PRAGMA query_only=ON` from write-capable `writeDb()` used by ingest.

Major route groups:

- Query/read: metrics, sources, observations, latest, series, stats, integrity.
- Ingest/write: generic ingest, Apple Health ingest, ingest replay, ingest log, quarantine.
- Management: source creation, metric creation and metric deprecation/description edits.
- Intelligence: dashboard, training, nutrition, recovery, correlations, experiments, predictions, product status.
- Health OS: biomarkers, bloodwork, stress, briefings, health profile, progress, decision support, operating system.
- Full platform: platform home, tracking schema, mood, wellbeing, symptoms, body composition, advanced sleep, nutrition intelligence, recovery intelligence, training intelligence, longitudinal, baselines, risks and insights.

## Ingest

`api/lib/ingest.js` normalizes records, validates metric/unit/date/source identity, quarantines invalid records, logs every batch and upserts valid records using idempotent LWW semantics. `api/lib/apple-health.js` maps Auto Health Export metrics into canonical daily observations.

## Dashboards

The browser UI in `api/public/index.html`, `api/public/app.js` and `api/public/styles.css` consumes local `/api/v1` endpoints. It contains views for home, track, insights, risks, mood, symptoms, body, sleep, nutrition, recovery, training, biomarkers, longitudinal, baselines and reports.

## Intelligence Layer

`api/lib/intelligence.js` contains core dashboard, domain summaries, correlations, experiments and predictions. `api/lib/health-os.js` contains biomarkers, bloodwork, stress, briefings, profile, goals, progress, decision support and OS projection. `api/lib/platform.js` contains domains 14-24 and integrated platform workflows.

## Integrations

Current integrations are Shred-derived backfill/dual-write, manual UI ingest, generic API ingest and Apple Health Auto Health Export mapper. Lab support exists as schema, source and biomarker vocabulary, but no dedicated lab import parser was found.

## Migrations

Applied migrations: 001 at 2026-06-09 16:15:14; 002 at 2026-06-09 16:24:50; 003 at 2026-06-09 19:34:46; 004 at 2026-06-09 19:38:15; 005 at 2026-06-09 19:47:15; 006 at 2026-06-09 19:48:39. Migration policy is additive-only.
