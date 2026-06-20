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

## Still Open

- Real Apple Health export verification (external: phone export; tooling ready).
- Real lab report format validation (external: sample reports; parser ready).
- FEATURE_AUDIT re-classification.
- Manual quick-log and health milestones restored; continue hardening with real usage data.

## 2026-06-20 — Daily digest / Today API (issue #36)

- Added `todayDigest()` in `api/lib/health-os.js`: read-only assembly of latest
  persisted daily briefing summary, lifecycle-filtered open recommendations,
  deterministic goal due/off-track/streak sections, priority-sorted highlights
  and the canonical `DECISION_DISCLAIMER`.
- `operatingSystem()` now uses the same digest for its `today` field; v1 exposes
  `GET /api/v1/today` plus `GET /api/v1/os` as a digest alias.
- Added fixture coverage for mixed content, all-empty state, priority ordering,
  snoozed recommendation exclusion, disclaimer presence and Europe/Amsterdam
  date calculation. Smoke now checks `/api/v1/today`.
