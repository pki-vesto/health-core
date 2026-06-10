# Health Core Product Vision

Date: 2026-06-09

## Mission

Health Core is the personal operating system for health, performance and recovery. Its mission is to turn local personal health signals into durable memory, trustworthy analytics and practical self-understanding without outsourcing private health data.

## Target User

The product is designed for a single owner who actively tracks body composition, training, nutrition, sleep, recovery, biomarkers, stress, mood and symptoms. The current architecture assumes one user, one local SQLite Core and private access over local network or Tailscale.

## Core Problems

- Health data is fragmented across apps, devices and manual logs.
- Raw numbers are hard to compare across time without consistent metric semantics.
- Corrections and re-imports can create duplicates unless ingest is idempotent.
- Most health dashboards show isolated charts instead of connected context.
- Privacy-sensitive personal data should remain local by default.

## Core Functionality Present Today

- Canonical observations time series in SQLite.
- Versioned local API with read-only query path and audited ingest path.
- Generic observation ingest, Apple Health mapper, replay and quarantine.
- Metric/source registries with additive-only controls.
- Dashboard, time series, stats, integrity, correlations and predictions.
- Biomarker, bloodwork, stress, mood, symptom, body composition, sleep, nutrition, recovery, training, longitudinal, baseline, risk and insight endpoints.
- Browser UI for home, tracking, insights, risks and major intelligence domains.

## Future Direction

The next product phase should harden the existing broad platform into a reliable daily operating system: real-device Apple Health verification, richer real data coverage, lab import workflow, stronger tests for intelligence math, complete user-visible reports and explicit source precedence policy.
