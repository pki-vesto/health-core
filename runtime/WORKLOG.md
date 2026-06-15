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
- Found + recorded (not yet fixed) a dead `heart.resting_rate` branch in
  `platform.js fatigueScore` (see audit/TECH_DEBT.md).

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
- NOTE: the design has no manual "Track" screen, so the old quick-log form was
  dropped from the UI; the manual-ingest API + correction semantics (#13) remain
  and stay unit-tested (`test/track.test.mjs`). Biomarker entry is the Lab tab.
- Single pre-deploy gate added at `scripts/check.mjs`: offline unit,
  governance and schema checks always run; smoke/e2e are conditional.
- Verified: Playwright e2e rewritten to the new DOM (7 tests) — green vs demo AND
  live; smoke 91/91; unit 10 suites green. Deployed live (:8091).

## Still Open

- Real Apple Health export verification (external: phone export; tooling ready).
- Real lab report format validation (external: sample reports; parser ready).
- `platform.latestMap` precedence adoption; FEATURE_AUDIT re-classification.
- Optional: re-add a manual quick-log UI if desired (design omitted it).
