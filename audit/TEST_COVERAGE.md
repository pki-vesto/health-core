# Health Core Test Coverage

Date: 2026-06-09

## Offline unit/fixture suite — `api/test/unit.mjs`

Runs with no live server (temp DBs built from coredb seed + migrations). Invoke:

```bash
docker run --rm -v "$HOME/health-core":/work -w /work/api \
  health-core-api:latest node test/unit.mjs
```

Suites (all green):

- `intelligence.test.mjs` — dashboard/recovery/nutrition/training summaries, scores, anomaly alerts, experiment readiness, platform status.
- `health-os.test.mjs` — biomarker scorecard/abnormal, sex-specific reference selection, stress scoring branches, briefing shape.
- `platform.test.mjs` — mood, body-composition, sleep, nutrition, recovery (fatigue), training, baselines, risk, insights. (Locks the dead `fatigueScore` rhr branch — see TECH_DEBT.)
- `migration.test.mjs` — bootstrap-from-empty: tables, required metrics, sources, 250 goals; migrate.mjs apply/idempotent/status/drift.
- `apple-health.test.mjs` — alias resolution + sleep-stage parsing + daily aggregation.
- `lab.test.mjs` — lab analyte mapping, unit conversion, reference status, idempotent commit.
- `math.test.mjs` — Pearson (±1, 0, known partial) and linear-regression forecast with known outputs.
- `precedence.test.mjs` — source precedence (ADR-008) + LWW interaction.
- `decision-support.test.mjs` — informational/non-clinical wording invariants.
- `track.test.mjs` — tracking correction semantics (stable id + LWW).
- `milestones.test.mjs` — record, biomarker-range and logging-streak milestone detection plus idempotent writes.

Also: `api/test/ingest.mjs` (temp-DB ingest integration) and `api/test/fixtures.mjs`
(+ `seed-domains.mjs`) shared harness/fixtures.

## Live-server tests

- `api/test/smoke.mjs` — read API + UI shell contract (`BASE=…`).
- `api/test/auth.test.mjs` — bearer-gated API with `CORE_BEARER_TOKEN`; health/UI stay open.
- `e2e/` — Playwright UI: home, navigation (all 16 views), track form + correction, all dashboards, Lab tab, Reports (daily→yearly incl. quarterly/yearly). See `e2e/README.md`.

## Governance / schema checks

- `scripts/governance-check.mjs` — BACKLOG/AUDIT/ROADMAP/NEXT_TASKS ↔ registry ↔ schema consistency.
- `scripts/dump-schema.mjs --check` — schema.sql drift check.

## Still missing / external

- Real-device Apple Health export compatibility (tooling ready; needs a real export).
- Real lab report format validation (parser ready; needs sample reports).
- `platform.latestMap` not yet precedence-aware (single-source in practice).
