# Health Core API — v1

The **single official interface** to the Core (Domain 1, goal 1). Reads go
through a connection opened with `PRAGMA query_only = ON` (hard, engine-level
read-only). Writes go through a **separate, audited ingest path** (Domain 1 write
side + Domain 2 feed) on its own RW connection — every batch is validated,
upserted idempotently (Last-Write-Wins), logged, and replayable; bad records are
quarantined, not dropped. `shred-api`'s live dual-write continues unchanged
alongside this (both writers coexist safely under WAL).

- **Base URL (tailnet):** `https://healthcore.tail9d0c71.ts.net`
  (Tailscale Serve terminates TLS on the dedicated `healthcore` node; not
  exposed publicly).
- **Local:** `http://localhost:8091`
- **Versioning (goal 3):** all data routes live under `/api/v1`. `/api/health`
  is unversioned and always open.

## Auth (goals 4/5)

Tailnet-gated by default (matches `shred-api`): WireGuard + tailnet ACLs decide
who reaches the host. Optional app-level bearer auth turns on by setting
`CORE_BEARER_TOKEN` in the compose env — then every `/api/v1/*` request needs
`Authorization: Bearer <token>` (constant-time compared). `/api/health` stays
open for uptime probes. **Do not** expose the host publicly or widen the tailnet
ACL to untrusted devices.

## Endpoints

### `GET /api/health` — liveness/readiness (goal 15)
Open, unversioned. `200` when the DB is reachable, `503` when degraded.
```json
{ "status":"ok","service":"health-core-api","version":"0.1.0","api":"v1",
  "uptime_s":1,
  "db":{ "ok":true,"query_only":true,"observations":41,"metric_types":6,
         "sources":4,"last_write":"…","last_observation":"2026-06-09" } }
```

### `GET /api/v1/metrics` — metric catalog
`?all=1` includes deprecated. → `{ "metrics":[{key,display_name,unit,value_kind,status,description}] }`

### `GET /api/v1/sources` — source registry
→ `{ "sources":[{id,name,kind}] }`

### `GET /api/v1/observations` — query the time-series
Query params (all optional): `metric`, `from` (YYYY-MM-DD), `to` (YYYY-MM-DD),
`source` (name), `limit` (default 500, max 5000), `offset`.
```json
{ "total":41,"limit":500,"offset":0,
  "rows":[{ "timestamp":"2026-06-09","metric_type":"nutrition.calories",
            "value":1536.35,"unit":"kcal","source":"shred",
            "external_id":"foods-day:2026-06-09","source_updated_at":"…",
            "metadata":{…},"updated_at":"…" }] }
```
Invalid `metric` or malformed date → `400`.

### `GET /api/v1/observations/latest` — newest point per metric (Today Snapshot)
`?metrics=body.weight,nutrition.calories` to filter. → `{ "latest":[…] }`

### `GET /api/v1/export/observations` — full observations NDJSON export
Streams every matching observation as newline-delimited JSON with
`Content-Type: application/x-ndjson`. Supports the same filters as
`/observations`: `metric`, `from`, `to`, `source`. This route is intentionally
not paginated and is intended for local portability/export jobs.
```json
{"timestamp":"2026-06-09","metric_type":"nutrition.calories","value":1536.35,
 "unit":"kcal","source":"shred","external_id":"foods-day:2026-06-09",
 "source_updated_at":"…","metadata":{…},"updated_at":"…"}
```
Invalid `metric` or malformed date → `400`.

### `GET /api/v1/export/observations.json` — bounded JSON export
Returns a single JSON document for smaller pulls. Supports the same filters as
the NDJSON route plus `max` (default and maximum: `10000`).
```json
{ "exported_at":"2026-06-15T11:00:00.000Z", "count":1,
  "observations":[{ "timestamp":"2026-06-09", "metric_type":"body.weight",
    "value":79, "unit":"kg", "source":"manual", "external_id":"…" }] }
```
Invalid filters → `400`; a requested JSON export larger than `max` → `413`.

### `GET /api/v1/series/:metric` — chart-ready series
`?bucket=day|week|month` (default `day`), `?agg=avg|sum|min|max|count`
(default `avg`; ignored for `day`), `?from`, `?to`. Week buckets are
Monday-anchored.
```json
{ "metric":"body.weight","unit":"kg","bucket":"day","agg":"avg",
  "points":[{ "period":"2026-06-04","value":79,"n":1 }] }
```

### `GET /api/v1/stats` — per-metric summary
→ `{ "stats":[{metric_type,count,first,last,min,max,avg}] }`

### `GET /api/v1/integrity` — data-quality report (goal 14)
`200` when clean, `409` when any check fails. Checks: orphan metric_types,
unknown sources, duplicate identity keys, null required fields, unit
consistency, timestamp validity (no future/malformed), per-metric plausibility
bounds.
```json
{ "ok":true,"passed":7,"failed":0,"checks":[{ "name":"…","ok":true,"detail":"…","count":0 }] }
```

## Intelligence Read API (goals 26-100)

All intelligence routes are read-only projections over `observations`.

- `GET /api/v1/dashboard?days=30&to=YYYY-MM-DD` — dashboard cards, scores,
  trends and anomaly alerts.
- `GET /api/v1/training/summary?days=30` — training metric trends and load.
- `GET /api/v1/nutrition/summary?days=30` — nutrition trends, macro balance and
  consistency.
- `GET /api/v1/recovery/summary?days=30` — sleep/HRV/resting-HR trends and
  recovery score.
- `GET /api/v1/correlations?days=90&metrics=a,b,c` — Pearson correlations for
  paired daily metric values.
- `GET /api/v1/experiments/readiness` — existing experiments plus metrics with
  enough data for single-user baseline/test experiments.
- `GET /api/v1/predictions?days=90&horizon=14&metrics=a,b` — transparent local
  linear forecasts; metrics with insufficient data are omitted.
- `GET /api/v1/product/status` — maturity/status view, system counts and
  architecture invariants.

## Health OS Read API (supplied goals 101-130, 241-250)

The supplied post-100 backlog includes Domains 11-13 and 25. Goals 131-240 were
not included in the prompt text and are not invented by the implementation.

- `GET /api/v1/biomarkers/registry` — biomarker registry.
- `GET /api/v1/biomarkers/ranges?metric=blood.apob` — reference ranges with
  age and sex dimensions.
- `GET /api/v1/biomarkers/dashboard` — trends, abnormal markers and scorecard.
- `GET /api/v1/biomarkers/trends` — biomarker trend summaries.
- `GET /api/v1/biomarkers/abnormal` — latest values outside reference ranges.
- `GET /api/v1/biomarkers/correlations` — correlations between biomarkers.
- `GET /api/v1/biomarkers/scorecard` — normal/abnormal biomarker score.
- `GET /api/v1/bloodwork/overview` — cholesterol, ApoB, glucose, inflammation,
  hormone, vitamin and mineral panels.
- `GET /api/v1/bloodwork/cardiometabolic` — cardiometabolic score.
- `GET /api/v1/stress/summary` — stress model, trends, correlations, score and
  alerts.
- `GET /api/v1/stress/dashboard` — stress dashboard projection.
- `GET /api/v1/stress/alerts` — stress warnings.
- `GET /api/v1/briefing/daily|weekly|monthly|quarterly|yearly` — personal
  health briefings and reports. Each generation is persisted to
  `briefing_snapshots`; identical regeneration the same Europe/Amsterdam day is
  deduped on `payload_sha256`. The response includes the `snapshot_id` and a
  `deduped` flag so clients can immediately fetch or diff the stored artifact.
- `GET /api/v1/briefing/history?period=daily&limit=20` — recent snapshots
  (`id, period, generated_at, summary`), most recent first.
- `GET /api/v1/briefing/:id` — the stored briefing snapshot.
- `GET /api/v1/briefing/:id/diff` (or `/:id?diff=prior`) — structured diff vs.
  the previous snapshot of the same period (added/removed/changed for
  highlights, alerts and decisions, plus a summary delta). Returns
  `{ first: true, … }` when no prior snapshot exists.
- `GET /api/v1/health-profile` — personal health profile.
- `GET /api/v1/health-goals` — goal registry.
- `GET /api/v1/milestones` — persisted health milestones.
- `GET /api/v1/progress` — progress monitoring.
- `GET /api/v1/decision-support` — informational decision support.
- `GET /api/v1/operating-system` — combined personal Health Operating System
  projection.

## Write / Ingest (v1)

All writes are idempotent (re-send → 0 changes) and Last-Write-Wins (newer
`source_updated_at` corrects an existing value). Invalid records are quarantined;
the rest of the batch still lands.

### `POST /api/v1/ingest` — generic observation ingest
Body: `{ "source":"manual", "records":[ { "metric_type","value","timestamp",
"external_id", "unit?","source_updated_at?","metadata?" } ] }`. `200` on
success, `422` if every record was quarantined. →
`{ ingest_id, status, records_in, records_written, records_quarantined }`.

### `POST /api/v1/ingest/apple-health` — Auto Health Export (goal 16)
Body = the Auto Health Export JSON (`{ data:{ metrics:[…] } }`). Maps known
metrics (steps, resting HR, HRV SDNN, VO2 max, sleep) to one value per day and
ingests them. Unknown metric names are reported in `skipped`, not quarantined.
→ `{ ingest_id, status, records_*, skipped, mapped_metrics }`.

### `POST /api/v1/ingest/:id/replay` — replay a logged ingest (goal 8)
Re-runs an `ingest_log` entry from its stored raw payload. Idempotent (LWW) →
typically `records_written: 0` unless the data changed since.

### `POST /api/v1/milestones/detect` — detect and persist health milestones
Runs idempotent milestone detection over existing observations and writes only
new `health_milestones` rows. Does not mutate observations. →
`{ detected, written }`.

### `GET /api/v1/ingest` — audit log (goal 7) · `GET /api/v1/ingest/:id`
`?full=1` includes the raw payload. → `{ ingests:[…] }`.

### `GET /api/v1/quarantine` — rejected records (goal 10)
`?resolved=1` for resolved. → `{ quarantine:[{ ingest_id, raw_record, reason }] }`.

### `POST /api/v1/sources` — create/confirm a source (goal 11)
Body `{ name, kind }`. Idempotent; `409` if name exists with a different kind.

### `POST /api/v1/metrics` — create/confirm a metric_type (goal 12)
Body `{ key, display_name, unit, value_kind?, description? }`. **Additive-only**:
`409` if the key exists with a different unit/value_kind.

### `PATCH /api/v1/metrics/:key` — deprecate / edit description
Body `{ status?, description? }`. `unit`/`value_kind`/`key` are immutable
(`409`) — vocabulary is additive-only (invariant 3).

### `POST /api/v1/user-goals` — owner-defined health goal (issue #34)
Body `{ metric_key, comparator, target_value?, target_low?, target_high?,
window?, deadline?, status?, label? }`. `metric_key` must exist in
`metric_types` (otherwise `400 unknown_metric_key`). Comparator vocabulary:
`lte | gte | eq | range`. For `lte | gte | eq`, `target_value` is required
and `target_low/target_high` must be absent; for `range`, both `target_low`
and `target_high` are required with `target_low <= target_high` and
`target_value` must be absent. `deadline` (optional) is a calendar date
`YYYY-MM-DD` interpreted in Europe/Amsterdam. Default `status` is `active`.
→ `201 { goal: {...} }`. This is distinct from the legacy 1-250 development
registry behind `/api/v1/goals` / `/progress` (table `health_goals`), which
stays untouched.

### `GET /api/v1/user-goals` — list owner goals
Optional `?status=active|paused|achieved|retired`. → `{ goals: [...] }`
ordered most-recent first.

### `GET /api/v1/user-goals/:id` — single goal
`404` if missing.

### `PATCH /api/v1/user-goals/:id` — edit / pause / retire
Body is a partial of the create payload (plus `status`). The merged row is
re-validated so a comparator switch revalidates value fields. There is no
DELETE — retire/pause is a `status` change. `updated_at` is touched on every
patch.

## Errors
`400` bad request (validation) · `401` unauthorized (when bearer on) ·
`404` unknown route · `409` integrity failed / additive-only violation ·
`422` all records quarantined · `500` internal · `503` DB down.
All errors: `{ "error":"message" }`.

## Operations

```bash
cd ~/health-core
docker compose build core-api && docker compose up -d            # deploy
docker logs --tail 20 health-core-api                            # structured JSON request logs (goal 6)
NODE_MODULES_BASE=$PWD/api/node_modules/noop.js node scripts/check.mjs
BASE=http://localhost:8091 NODE_MODULES_BASE=$PWD/api/node_modules/noop.js node scripts/check.mjs
BASE=http://localhost:8091 node api/test/smoke.mjs               # read contract tests (28)
docker run --rm -v $PWD:/hc -e NODE_MODULES_BASE=/app/node_modules/ \
  -w /hc/api health-core-api:latest node test/ingest.mjs         # ingest logic tests (17, temp DB)
```

`scripts/check.mjs` is the single pre-deploy gate. Offline it runs unit tests,
governance, and schema drift checks. With `BASE=...` it also runs read-only
smoke. Playwright e2e is opt-in with `RUN_E2E=1` or `--e2e`; because the e2e
suite can write through the Track workflow, also set `E2E_MUTATING_OK=1` only
when `BASE` points at a disposable Core DB.

Migrations (goal 13) — additive-only, checksum-tracked:
```bash
docker run --rm -v /home/peter/health-core:/hc -e CORE_DB=/hc/data/core.db \
  -e NODE_MODULES_BASE=/app/node_modules/ health-core-api:latest \
  node /hc/scripts/migrate.mjs [--status|--dry-run]
```

Core backup and observation portability:
```bash
cd ~/health-core
NODE_MODULES_BASE=$PWD/api/node_modules/ CORE_DB=$PWD/data/core.db \
  node scripts/backup-core.mjs

curl -H "Authorization: Bearer $CORE_BEARER_TOKEN" \
  http://localhost:8091/api/v1/export/observations > observations.ndjson
```
See `docs/BACKUP.md` for restore steps.

## Rollback
`docker compose down` removes the API with zero effect on the Core or on
`shred-api`. The reader is stateless; the only Core change M1 made is the
additive `schema_migrations` table. See `../ROLLBACK.md`.
