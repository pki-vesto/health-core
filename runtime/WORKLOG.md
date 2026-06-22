# Worklog

Date: 2026-06-09

## Built Before This Governance Bootstrap

- SQLite observations core, sources and metric registry.
- Shred backfill and dual-write support.
- Migration framework with migrations 001-006 applied.
- Express API with read-only query path and audited ingest path.
- Apple Health mapper for synthetic Auto Health Export payloads.
- Dashboard, analytics, correlations, experiments, predictions and Health OS route families.
- Browser UI for major platform workflows.
- Smoke and ingest tests currently passing.

## Changed In This Session

- Created permanent governance files under `docs/`, `runtime/` and `audit/`.
- Generated a machine-readable 1-250 backlog from the live goal registry.
- Generated a code-evidence feature audit that distinguishes complete from backend-only maturity.
- Defined the autonomous development rule and next task queue.

## 2026-06-09 — Product-hardening run (prior NEXT_TASKS 1-20)

- Added deterministic fixture unit tests for intelligence/health-os/platform scoring,
  correlation+prediction math, lab parser, apple-health mapper, source precedence,
  decision-support wording, tracking correction, and a migration-from-empty regression
  test. Aggregated offline runner: `api/test/unit.mjs` (10 suites, all green).
- Shared test fixtures (`api/test/fixtures.mjs`) + reusable domain seeder
  (`api/test/seed-domains.mjs`) + demo server (`scripts/seed-demo.mjs`).
- Apple Health mapper aliases + sleep-stage parsing; importer/verifier script + doc.
- Dedicated lab parser + review/commit + Lab UI tab.
- Source precedence policy ADR-008 (`query.js` preferLatest) across latest pickers.
- Decision-support wording made informational/non-clinical (DECISION_DISCLAIMER).
- Split `platform.js` helpers into `lib/series.js` (behaviour-locked by tests).
- `schema.sql` is now generated + drift-checked; governance consistency check added.
- Playwright UI suite (`e2e/`, 17 tests) incl. reports view extended with
  quarterly/yearly briefings.
- Fixed the dead `heart.resting_rate` branch in `platform.js fatigueScore` by
  computing RHR locally for fatigue scoring; high recovery warnings and
  overtraining are now reachable in `api/test/platform.test.mjs`.

## 2026-06-20 — Forecast uncertainty and backtest hardening

- Extended `GET /api/v1/predictions` forecast math with R2, residual standard
  error, fit quality, fit-derived confidence and a documented approximate 95%
  residual-error interval (`next +/- 1.96 * residual_std`).
- Added an opt-in `backtest=1` hold-out tail accuracy field plus deterministic
  math tests for perfect, noisy, constant, sparse and backtested series.

## 2026-06-09 — UI redesign ("Personal Health OS", Claude Design handoff)

- Implemented the Claude Design handoff (`Health Core.html` + bundle) as a full
  re-skin of `api/public/` — vanilla JS + CSS, NO CDN/React (local-first), wired
  to the real `/api/v1` endpoints (not the prototype's mock data).
- New shell: left sidebar grouped Dagelijks/Domeinen/Systeem, topbar with date +
  Briefing, mobile bottom-nav + "Meer" sheet, light/dark toggle, accent/density/
  font settings (persisted). Warm-neutral design tokens; system humanist fonts.
- All 11 screens, Dutch, briefing-toned: Vandaag (readiness gauge + contributors
  + tiles + insights + risks + experiments), Inzichten (filterable insight cards
  + detail sheet), Trends (metric switcher + line/bar charts + baseline + stats +
  correlation scatters), Herstel, Training, Voeding, Gezondheid (biomarkers +
  stress/mood/body + Lab import/review tab), Experimenten (candidate metrics),
  Rapporten (daily→yearly briefing covers + preview sheet), Data Core (sources/
  registry/integrity), Instellingen.
- SVG chart primitives (sparkline/line/bar/ring/stackbar/scatter), hash routing,
  graceful empty states for sparse data.
- Manual "Track" screen restored: the UI can write daily manual observations
  through the generic ingest path with stable correction semantics. Biomarker
  entry remains the Lab tab.
- Health milestones now have an idempotent detector, script/POST entrypoint,
  persisted read route and trends UI list.
- Single pre-deploy gate added at `scripts/check.mjs`: offline unit,
  governance and schema checks always run; smoke/e2e are conditional.
- Verified: Playwright e2e rewritten to the new DOM (7 tests) — green vs demo AND
  live; smoke 91/91; unit 10 suites green. Deployed live (:8091).

## 2026-06-15 — Briefing snapshots + history/diff (issue #32)

- Additive migration `008_briefing_history.sql` adds `briefing_snapshots`
  (id/period/generated_at/payload/payload_sha256/summary) plus two indexes.
  `schema.sql` regenerated (15 tables, 10 indexes).
- `api/lib/health-os.js` gained `snapshotBriefing()`, `briefAndSnapshot()`,
  `listBriefingSnapshots()`, `getBriefingSnapshot()`, `priorBriefingSnapshot()`.
  Each generated briefing is now persisted by the v1 `/briefing/:period`
  generators via `writeDb()`, dedupe-by-day on `(period, payload_sha256,
  substr(generated_at,1,10))`; `brief.generated_at` is built in Europe/Amsterdam
  so day-bucketing is timezone-correct across midnight UTC.

- `api/lib/briefing-diff.js` — pure `diffBriefings(prev, next)` returning
  `{ first, summary, highlights, alerts, decisions }` with added/removed/changed.
- New `api/routes/briefing.js` mounts `GET /briefing/history`, `/briefing/:id`,
  `/briefing/:id/diff` (and `/:id?diff=prior` inline form). Read-only.
- Tests added (3 suites, 53 assertions): `briefing-snapshot.test.mjs` (persist +
  dedupe + history ordering), `briefing-diff.test.mjs` (added/removed/changed +
  first-shot shape), `briefing-routes.test.mjs` (HTTP handlers incl. 400/404 +
  no-prior diff). `migration.test.mjs` now requires `briefing_snapshots`.
- `unit.mjs` now awaits suite results so the async HTTP route suite can join the
  aggregate run. Full suite green (16/16). Governance + schema drift clean.

## 2026-06-20 — Today Health OS action surface (issue #37)

- Reworked the `Vandaag` tab into a Health OS daily-loop surface backed by
  `/api/v1/today` with `/api/v1/os` fallback: digest summary, highlights, open
  recommendations, due/off-track goals, goal progress, streaks and the
  non-clinical disclaimer.
- Added inline recommendation actions (`acknowledge`, `snooze`, `dismiss`,
  `done`) posting the backend lifecycle statuses to
  `/api/v1/recommendations/:rec_key/action`; successful actions remove the item
  from the active list without a full page reload.
- Added scoped Today UI styling plus Playwright coverage for digest rendering,
  action removal, goal progress and empty states.
## 2026-06-18 — Domain fixture expansion (issue #3)

- Expanded `api/test/seed-domains.mjs` with an explicit `DOMAIN_FIXTURE_COVERAGE`
  manifest for all 25 registered domains.
- Seeded every active metric, including previously uncovered score/baseline
  metrics, plus representative experiments, ingest/quarantine, derived metrics,
  milestones, insight history, briefing snapshots and user health goals.
- Added `api/test/domain-fixtures.test.mjs` to prove domain coverage, active
  metric coverage, sparse lab data, incomplete quarantine input and deterministic
  fixture output.

## 2026-06-15 — User-defined health goals & targets (issue #34)

- Additive migration `010_user_health_goals.sql` adds `user_health_goals`
  (id/metric_key→metric_types(key)/comparator∈{lte,gte,eq,range}/target_value/
  target_low/target_high/window/deadline/status∈{active,paused,achieved,retired}/
  label/created_at/updated_at) plus two indexes (status, metric_key). Distinct
  from the legacy `health_goals` 1-250 dev registry — that table and its
  surfaces (`/api/v1/goals`, `/progress`) are untouched. `schema.sql` regenerated
  (16 tables, 12 indexes).
- New router `api/routes/user-goals.js` mounts under `/api/v1/user-goals`:
  - `POST /user-goals` (create; validates metric_key exists in `metric_types`
    with a clean `unknown_metric_key` 400 instead of a FK-violation 500;
    enforces comparator/value-field shape — `range` requires low+high and
    rejects target_value; `lte|gte|eq` require target_value and reject
    low/high; range needs low ≤ high; deadline must be a real ISO date
    `YYYY-MM-DD` — owner-facing day precision, Europe/Amsterdam calendar).
  - `GET /user-goals?status=…` (filter; DESC by created_at).
  - `GET /user-goals/:id` (404 on missing; 400 on non-integer id).
  - `PATCH /user-goals/:id` (partial; merged row re-validated so a comparator
    switch revalidates value fields; touches `updated_at`; never deletes —
    retire/pause is a status change).
- `api/db.js`: resolved `CORE_DB` per open instead of at module load, plus a
  test-only `__resetForTests()` helper, so the unit aggregator can boot
  multiple Express route suites in one process without singletons stuck on a
  previous suite's now-unlinked temp DB. No production behaviour change
  (`CORE_DB` is set once at process start in prod).
- Server mounts `userGoals` on `/api/v1` so it lives under the same bearer-auth
  gate as the rest of the data API.
- Tests: new `api/test/user-goals.test.mjs` (41 assertions) covering create per
  comparator, unknown metric_key, missing/inconsistent target fields, invalid
  comparator/status/deadline, list (with/without filter), get-by-id, PATCH
  (label/target_value/status churn including round-trip back to active without
  row deletion, comparator switch revalidation, empty body), legacy
  `/api/v1/goals` and `/progress` regression guard, and migration idempotency.
  Aggregator (`api/test/unit.mjs`) registers the new suite. `migration.test.mjs`
  now requires `user_health_goals` in the bootstrap table set. Full suite green
  (17 suites). Governance + schema drift clean. Predeploy `node scripts/check.mjs`
  passes.

## 2026-06-20 — Experiment lifecycle write path (issue #27)

- Added `api/lib/experiments.js` for experiment validation, create, status
  changes, persisted analysis, and deterministic baseline/test verdicts.
  Metrics must exist in `metric_types`; windows are real `YYYY-MM-DD` dates;
  statuses are `planned|active|concluded|abandoned`.
- Added `api/routes/experiments.js`, mounted under `/api/v1`, with
  `GET/POST /experiments`, `GET /experiments/:id`,
  `PATCH /experiments/:id`, and `GET /experiments/:id/analysis`. Writes use
  `writeDb()` and analysis only reads `observations`; verdicts are stored in
  `experiments.result`.
- Updated `api/public/app.js` so the Experimenten view can create experiments,
  start/conclude/abandon them, and display stored sufficient or insufficient
  verdicts. Existing readiness data remains available for candidate metrics.
- Tests: added `api/test/experiments.test.mjs` and registered it in
  `api/test/unit.mjs`. Verification run:
  `NODE_MODULES_BASE=$PWD/node_modules/noop.js node test/experiments.test.mjs`
  (18 passed) and
  `NODE_MODULES_BASE=$PWD/node_modules/noop.js node test/unit.mjs`
  (0 failed across 20 suites).

## Still Open

- Real Apple Health export verification (external: phone export; tooling ready).
- Real lab report format validation (external: sample reports; parser ready).
- FEATURE_AUDIT re-classification.
- Manual quick-log and health milestones restored; continue hardening with real usage data.
