# Health Core Technical Debt

Date: 2026-06-09

## High Impact

1. Intelligence modules are broad and dense. `api/lib/platform.js`, `health-os.js` and `intelligence.js` combine route-facing models, scoring, trend math and domain policy. Split only when tests exist around current behavior.
2. Later domains are data-light. The API and UI surfaces exist, but live observations cover only weight, session volume and nutrition macros.
3. Source precedence is now encoded and applied across latest pickers (ADR-008: `SOURCE_PRECEDENCE`/`preferLatest` in `query.js`, applied to `latestPerMetric`, `intelligence.latestByMetric`, `health-os.latestFor` and `platform.latestMap`).
4. Lab support: dedicated parser + review/commit now exist (`api/lib/lab.js`, `/api/v1/lab/*`, UI Lab tab). Remaining: validate against real lab report formats.
5. UI tests are absent. The browser app is central to product value but currently covered only by smoke HTML checks.

## Correctness (found by fixture tests 2026-06-09, behaviour locked not yet fixed)

- `platform.js fatigueScore` reads a `heart.resting_rate` baseline, but `BASELINE_METRICS` does not contain `heart.resting_rate`, so the `+20` branch is dead. Effect: `fatigue` maxes at 70 (base 20 + HRV 25 + sleep 25). Downstream, `recoveryIntelligence` warning severity can never be `high` (needs >=85) and `trainingIntelligence.overtraining` (fatigue>=80) can never fire. Locked by `test/platform.test.mjs`. Fix candidate during #18: add `heart.resting_rate` to the baseline set (or read its baseline independently) — this changes outputs, so update the tests in the same change.

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
