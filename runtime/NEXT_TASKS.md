# Next Tasks

Date: 2026-06-09

## Completed in the 2026-06-09 hardening run

The prior 20-item queue is done. Summary:

- Deterministic fixture unit tests for intelligence, health-os and platform scoring.
- Migration-from-empty regression test (tables, metrics, sources, 250 goals, runner mechanics).
- Apple Health: camelCase/synonym aliases + sleep-stage parsing + tests; real-export importer/verifier (`scripts/import-apple-health.mjs`) + `docs/APPLE-HEALTH-IMPORT.md`.
- Dedicated lab parser + review/commit (`api/lib/lab.js`, `/api/v1/lab/*`) and a Lab UI tab (parse → review → commit).
- Source precedence policy (ADR-008): `SOURCE_PRECEDENCE`/`preferLatest` in `query.js`, applied to all latest pickers including `platform.latestMap`, with tests.
- Quality tests for correlation (Pearson) and prediction (linear regression) math.
- Auth-on smoke test with `CORE_BEARER_TOKEN` (`test/auth.test.mjs`).
- Decision-support wording normalised to informational/non-clinical + tests.
- `platform.js` helpers split into `lib/series.js` (behaviour-locked by tests).
- `schema.sql` generated + drift-checked (`scripts/dump-schema.mjs`).
- Governance consistency check (`scripts/governance-check.mjs`).
- Reusable domain seeder (`test/seed-domains.mjs`) + demo server (`scripts/seed-demo.mjs`).
- Playwright UI coverage (`e2e/`): home, navigation, track + correction, dashboards, lab, reports (incl. quarterly/yearly).
- Tracking form correction semantics (stable external_id + LWW + confirm guard).

Offline suite: `node test/unit.mjs` (10 suites). Live: `test/smoke.mjs`,
`test/auth.test.mjs`, `e2e/`. Governance: `scripts/governance-check.mjs`,
`scripts/dump-schema.mjs --check`.

## Primary autonomous queue

1. Run a real Auto Health Export through `scripts/import-apple-health.mjs` (dry-run → add any unmapped aliases → `--post`); fill the observed-field-names table in `docs/APPLE-HEALTH-IMPORT.md`. External dep: a real phone export.
2. Validate the lab parser against real lab report formats; extend analyte aliases/conversions as needed. External dep: representative lab reports.
3. Wire `test/unit.mjs`, `e2e`, `scripts/governance-check.mjs` and `scripts/dump-schema.mjs --check` into a single pre-deploy gate (Definition of Done).
4. Re-classify `audit/FEATURE_AUDIT.md` backend-only goals now covered by tests/data tooling, keeping the header summary in sync.
