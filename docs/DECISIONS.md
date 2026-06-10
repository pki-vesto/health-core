# Health Core Architecture Decisions

Date: 2026-06-09

## ADR-001: SQLite Is The Local Core

Decision: Health Core uses local SQLite `core.db` as the canonical store.

Motivation: single-user, local-first, easy backup, WAL-compatible readers/writers.

Alternatives: hosted database, embedded JSON files, direct reuse of Shred database.

Consequences: excellent privacy and simplicity; requires discipline around migrations and local backup.

## ADR-002: Observations Are The Kernel

Decision: health facts are stored as typed observations with source identity and external IDs.

Motivation: one durable model can support many domains and read models.

Alternatives: domain-specific primary tables for every feature.

Consequences: domain-specific intelligence must translate into/from metric types carefully.

## ADR-003: Additive-Only Metrics

Decision: metric keys, units and value kinds are immutable; changes require new metric keys.

Motivation: historical data remains interpretable.

Alternatives: mutate metric semantics in place.

Consequences: more metric keys over time, but safer history.

## ADR-004: Separate Read And Write Connections

Decision: read API uses `PRAGMA query_only=ON`; ingest uses a dedicated write connection.

Motivation: read paths cannot accidentally mutate Core.

Alternatives: shared read/write connection.

Consequences: simpler safety reasoning, explicit write boundary.

## ADR-005: Idempotent LWW Ingest

Decision: observations are unique by source, external ID and metric type; newer `source_updated_at` wins.

Motivation: imports and replays must be safe.

Alternatives: append every correction, delete/rewrite batches.

Consequences: corrections are simple; audit history lives in ingest logs, not multiple observation rows.

## ADR-006: Local/Tailnet Security Model

Decision: default access is local/Tailscale, with optional bearer token.

Motivation: privacy-first single-user deployment.

Alternatives: public SaaS auth stack.

Consequences: simpler operation; public exposure remains forbidden without new ADR.

## ADR-008: Source Precedence For Same-Day Multi-Source Conflicts

Decision: when more than one source reports the same metric on the same calendar
day, the authoritative "latest value" is chosen by source trust order, then by
last-write-wins within that source. Order:
`manual > lab > apple_health > shred > health_core > (unknown)`.

Resolution is two-stage: (1) the latest calendar day wins; (2) within that day,
the highest-trust source wins; (3) within the same source, newer
`source_updated_at` then `updated_at` wins. A stale high-trust value therefore
never overrides a fresher day from another source.

Rationale: a manual user correction is the strongest signal; lab measurements are
clinical-grade; device data (Apple Health) beats derived module aggregates
(Shred); internal/health_core is lowest. LWW (ADR-005) still governs conflicts
*within* a source.

Implemented as `SOURCE_PRECEDENCE` / `preferLatest()` in `api/lib/query.js`, used
by `query.latestPerMetric` (`/observations/latest`), `intelligence.latestByMetric`
(dashboard cards) and `health-os.latestFor` (biomarker/profile snapshots). Tested
in `api/test/precedence.test.mjs`.

Not yet applied: `platform.latestMap` (mood/nutrition latest) remains recency-only
— those metrics are single-source (manual) in practice; tracked in TECH_DEBT.

Alternatives: pure last-write-wins regardless of source (loses trust ordering);
per-metric precedence tables (more flexible, more config).

Consequences: deterministic, trust-ordered reads; ingest still stores every
source's value (precedence is a read-time resolution, not a delete).

## ADR-007: Governance Files Are Persistent Control Plane

Decision: future sessions must drive from master directive, roadmap, backlog, audit and runtime queue.

Motivation: project scale exceeds one-off prompts.

Alternatives: continue relying on ad hoc instructions.

Consequences: documentation must be maintained as part of Definition of Done.
