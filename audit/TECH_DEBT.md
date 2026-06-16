# Health Core Technical Debt

Date: 2026-06-09

## High Impact

1. Intelligence modules are broad and dense. `api/lib/platform.js`, `health-os.js` and `intelligence.js` combine route-facing models, scoring, trend math and domain policy. Split only when tests exist around current behavior.
2. Later domains are data-light. The API and UI surfaces exist, but live observations cover only weight, session volume and nutrition macros.
3. Source precedence is now encoded and applied across latest pickers (ADR-008: `SOURCE_PRECEDENCE`/`preferLatest` in `query.js`, applied to `latestPerMetric`, `intelligence.latestByMetric`, `health-os.latestFor` and `platform.latestMap`).
4. Lab support: dedicated parser + review/commit now exist (`api/lib/lab.js`, `/api/v1/lab/*`, UI Lab tab). Remaining: validate against real lab report formats.
5. UI tests are absent. The browser app is central to product value but currently covered only by smoke HTML checks.

## Correctness (found by fixture tests 2026-06-09)

- Fixed in #17: `platform.js fatigueScore` now computes a local `heart.resting_rate` baseline, so elevated RHR can add fatigue without changing the public `/baselines` metric set. `recoveryIntelligence` high-severity warnings and `trainingIntelligence.overtraining` are now reachable and locked by `api/test/platform.test.mjs`.
- Resolved in #33: `decisionSupport()` recommendations now carry a deterministic `rec_key` and an additive `recommendation_actions` table records acknowledge / snooze / dismiss / done events. The active surface filters by latest-action-per-key (dismissed/done hidden; snoozed hidden until `snooze_until`), with the same Europe/Amsterdam clock the briefing layer uses. Wording invariants (`DECISION_DISCLAIMER`, `informational:true`) preserved.

## Medium Impact

- Some report capabilities are route-only or indirectly surfaced in UI.
- Metric scoring thresholds are embedded in code without external calibration or tests.
- `schema.sql` is now GENERATED from the real bootstrap (`scripts/dump-schema.mjs`) and drift-checked (`--check`, wired into the governance check), so it can no longer silently diverge from `coredb.mjs` + migrations.
- The health_goals registry marks all 250 complete, which can hide backend-only maturity gaps unless the audit is consulted.

## Low Impact

- Host lacks `sqlite3` CLI; DB inspection relies on container/Node tooling.
- Existing docs had historical contradictions around goals 131-240 before this governance bootstrap.

## Priority

Fix test depth, real data coverage and lab workflow before large feature expansion.
