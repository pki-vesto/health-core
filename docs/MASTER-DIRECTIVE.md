# Health Core Master Directive

Date: 2026-06-09

This is the permanent operating directive for Health Core. Every future autonomous development session must treat this file as the project constitution.

## Product Vision

Health Core must grow into: **"Het persoonlijke besturingssysteem voor gezondheid, prestaties en herstel."**

The system is not a collection of dashboards. It is a local, single-user health operating layer that ingests signals, preserves provenance, turns observations into intelligence, and helps the owner understand health, performance and recovery over time.

## Architecture Invariants

- Observations are the kernel model: durable health facts live in `observations` with `metric_type`, `value`, `unit`, `timestamp`, `source`, `external_id`, `source_updated_at` and JSON metadata.
- Metrics are additive-only: never repurpose a metric key, unit or value kind. Deprecate and add a new key when semantics change.
- Source precedence is explicit: source identity, stable external IDs and source metadata determine where facts came from. Future conflict logic must preserve provenance instead of silently merging sources.
- Ingest is idempotent: replaying the same source payload must not duplicate observations.
- LWW is the correction model: newer `source_updated_at` wins for the same `source + external_id + metric_type`; older writes are ignored.
- Privacy-first: do not add cloud dependencies, telemetry, external analytics or public exposure without an explicit architecture decision.
- Local-first: SQLite and local/Tailscale-hosted API remain the primary runtime model.
- Single-user architecture: authorization, defaults, UX and data models optimize for one owner, not multi-tenant SaaS.

## Autonomous Development Directive

At the start of every future session, read in order:

1. `docs/MASTER-DIRECTIVE.md`
2. `docs/ROADMAP.md`
3. `docs/BACKLOG.md`
4. `audit/FEATURE_AUDIT.md`
5. `runtime/CURRENT_SPRINT.md`
6. `runtime/NEXT_TASKS.md`
7. `runtime/WORKLOG.md`

Then determine what is missing, what has priority and what the next logical task is. Work from `runtime/NEXT_TASKS.md` first. If that queue conflicts with code reality, update the governance files and explain the correction in `runtime/WORKLOG.md` before implementing.

Choose tasks by this order: failing correctness or safety, broken core invariant, missing tests around existing behavior, incomplete user workflow, data coverage/import gaps, refactors that remove real maintenance risk, then new capability.

A session may stop only when the selected task is complete and the governance files reflect the new state, or when a concrete blocker is recorded in `runtime/BLOCKERS.md`. A session must not stop merely because one task finished while `runtime/NEXT_TASKS.md` still contains runnable items and the user requested autonomous continuation.

When a task is completed, update `docs/BACKLOG.md`, `docs/ROADMAP.md`, `runtime/WORKLOG.md` and `runtime/NEXT_TASKS.md`. Then continue with the next task instead of returning to a waiting state while runnable queued work remains.

## Forbidden Behavior

- Do not use MVP thinking as an excuse to stop with broken workflows.
- Do not treat a vertical slice as the final result when surrounding workflow, tests, docs or data coverage are still incomplete.
- Do not deliver unfinished workflows as complete.
- Do not mark TODOs, stubs, placeholders or registry entries as done.
- Do not claim implementation from documentation alone; verify code, schema, routes, tests or runtime behavior.
- Do not break additive-only metrics, observation identity, idempotency, LWW or local-first operation.
- Do not add public network exposure or external services without a recorded decision.

## Definition Of Done

A feature is done only when all applicable conditions are true:

- Schema and migration are additive and applied through the migration framework.
- API behavior is implemented with validation, error behavior and stable response shape.
- Data is represented as observations or an explicitly documented read model.
- User workflow is available when the feature is user-facing.
- Tests cover happy path, validation/error path and regression risk.
- Documentation and backlog status are updated.
- Existing smoke and ingest tests pass.
- Edge cases are handled without corrupting observations or silently losing provenance.
- No TODO, stub, placeholder or registry-only entry is counted as completion.

## Continue Development Rule

For every future development session: read the seven startup files listed above, determine what is missing, what has priority and what the next logical step is, then work down the queue. On task completion update backlog, roadmap, worklog and next tasks, then continue directly with the next task while runnable queued work remains.
