# Blockers

Date: 2026-06-09

## Active Blockers

- Real Apple Health field verification needs an actual device export. TOOLING IS
  READY: `scripts/import-apple-health.mjs` (dry-run + import + verify) and
  `docs/APPLE-HEALTH-IMPORT.md`; mapper has camelCase/synonym aliases and
  sleep-stage summing with tests (`test/apple-health.test.mjs`). Only the real
  `.json` export from the phone is missing — run the dry-run on it, add any
  unmapped aliases, then `--post`.
- Lab workflow: a dedicated parser + review UI now exist (`api/lib/lab.js`,
  `POST /api/v1/lab/parse|commit`, UI Lab tab). Real sample lab report formats
  are still needed to confirm real-world panel/field naming.

## Architecture Questions

- What is the exact source precedence order when manual, Apple Health, Shred and lab sources report comparable facts?
- Should same-day manual UI entries default to append-only entries or correction/upsert semantics?
- Which medical decision-support language is acceptable for a personal, non-clinical tool?

## External Dependencies

- Real Apple Health export payload.
- Representative lab report files or API formats.
- User preference for report cadence and dashboard priority.
