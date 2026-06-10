# Health Core Platform Decisions

Date: 2026-06-09

## Product Shape

Health Core is implemented as a local-first personal Health Operating System:

- SQLite remains the canonical observations kernel.
- The API owns validation, ingest, replay, analytics and intelligence.
- The browser UI is served by the same local service and consumes only local
  `/api/v1` routes.
- New health domains are additive: new tables, new metrics, new read models;
  existing metric semantics are not changed.

## Verification Standard

Goals are not treated as complete because a roadmap says so. Completion requires
working schema, backend behavior, API route, UI navigation/workflow,
visualization or analysis where relevant, tests and documentation.

## Current Implementation

- Goals 1-25: platform and Apple Health ingest.
- Goals 26-130: dashboard, analytics, biomarkers, bloodwork and stress.
- Goals 131-240: mood, symptoms, composition, sleep 2.0, nutrition 2.0,
  recovery 2.0, training 2.0, longitudinal analysis, baselines, risks and
  insight engine.
- Goals 241-250: personal briefings, profile, goals, progress,
  decision-support and operating-system projection.

The working UI is served at `/` and the local development URL is
`http://localhost:8091/`.
