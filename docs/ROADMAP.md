# Health Core Roadmap

Date: 2026-06-09

Status values: completed, in progress, planned. This roadmap uses code/runtime evidence, not historical claims.

## Summary

- Registered goals: 250.
- Registry status: 250 completed.
- Audit correction: many later goals are contract/schema/API complete but still need real data, deeper tests or fuller UI workflows before they should be treated as mature product capability. Core DB backup and observations export now cover the durable-memory portability gap. Manual quick-log is now present in the UI and uses the existing generic ingest/correction contract. Health milestones now have an idempotent detection/write path and UI surface. Fixture coverage now spans all 25 registered domains and every active metric through `seedAllDomains()` plus `domain-fixtures.test.mjs`.
- 2026-06-15 (issue #34): The intent layer is now in place — owner-defined
  personal health targets live in a new `user_health_goals` table and are
  managed via `POST/GET/PATCH /api/v1/user-goals`. This unblocks the Daily Loop
  epic's progress/streaks child and "due goals" digest surface; the legacy
  `/goals` + `/progress` dev-registry surfaces stay as-is.

## Domains

### Domain 1: Platform foundation

Status: completed

Goals: 1-15

Completed: 15/15.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 2: Apple Health integration

Status: completed

Goals: 16-25

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 3: Dashboard foundation

Status: completed

Goals: 26-35

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 4: Training analytics

Status: completed

Goals: 36-45

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 5: Nutrition analytics

Status: completed

Goals: 46-55

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 6: Recovery analytics

Status: completed

Goals: 56-65

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 7: Correlation engine

Status: completed

Goals: 66-75

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 8: Experiment framework

Status: completed

Goals: 76-85

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 9: Predictive intelligence

Status: completed

Goals: 86-95

Completed: 10/10.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 10: Product maturity

Status: completed

Goals: 96-100

Completed: 5/5.

Open product-hardening notes: Improve depth tests and data fixtures around existing behavior.

### Domain 11: Biomarkers

Status: completed

Goals: 101-110

Completed: 10/10.

Open product-hardening notes: Move backend-ready surfaces toward complete visible workflows and real data ingestion.

### Domain 12: Bloodwork

Status: completed

Goals: 111-120

Completed: 10/10.

Open product-hardening notes: Move backend-ready surfaces toward complete visible workflows and real data ingestion.

### Domain 13: Stress intelligence

Status: completed

Goals: 121-130

Completed: 10/10.

Open product-hardening notes: Move backend-ready surfaces toward complete visible workflows and real data ingestion.

### Domain 14: Mood and wellbeing

Status: completed

Goals: 131-140

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 15: Symptoms

Status: completed

Goals: 141-150

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 16: Body composition

Status: completed

Goals: 151-160

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 17: Sleep 2.0

Status: completed

Goals: 161-170

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 18: Nutrition 2.0

Status: completed

Goals: 171-180

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 19: Recovery 2.0

Status: completed

Goals: 181-190

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 20: Training 2.0

Status: completed

Goals: 191-200

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 21: Longitudinal intelligence

Status: completed

Goals: 201-210

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 22: Personal baselines

Status: completed

Goals: 211-220

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 23: Risk detection

Status: completed

Goals: 221-230

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 24: Insights engine

Status: completed

Goals: 231-240

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

### Domain 25: Health OS briefings

Status: completed

Goals: 241-250

Completed: 10/10.

Open product-hardening notes: Validate intelligence quality with richer fixtures and user-facing acceptance tests.

## Next Roadmap Emphasis

1. Verify Apple Health with a real export.
2. Add dedicated lab import and lab-result review workflow.
3. Expand fixture data to cover all registered metric domains. **Done 2026-06-18:** `api/test/seed-domains.mjs` now exports an explicit 1-25 fixture coverage manifest, seeds every active metric plus representative capability tables, and `domain-fixtures.test.mjs` verifies coverage, edge cases and determinism.
4. Harden intelligence math with deterministic unit tests.
5. Complete report UI coverage for quarterly and yearly briefings.
