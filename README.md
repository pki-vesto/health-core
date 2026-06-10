# Health Core

> **V2 in progress** — transforming Health Core from a datastore into a personal
> Health Intelligence Platform (see the Master Build Brief). Milestone status:
> [`docs/ROADMAP.md`](docs/ROADMAP.md).
>
> **M1 (live): Core API** — the official read interface to the Core. Code in
> [`api/`](api/), reference in [`docs/API.md`](docs/API.md). Runs as its own
> Docker stack (`docker compose up -d`, `https://healthcore.tail9d0c71.ts.net`
> plus local `http://localhost:8091`), opens `core.db`
> read-only (`PRAGMA query_only=ON`), and does not touch the live dual-write.
> A migration framework ([`scripts/migrate.mjs`](scripts/migrate.mjs)) now tracks
> all schema changes (additive-only).

---

## Fase A (dual-write) — foundation

One canonical `observations` time-series that becomes the *system of record* for
pure signals (starting with bodyweight). Shred Tracker stays the primary store
for granular domain data (`sets`, `foods`); only day/session **aggregates** flow
into the core. **Fase A is additive and reversible** — `shred.db` is never
modified by this build.

- Out of scope (later sessions): read-cutover (a module reading from the core),
  stopping writes to `shred.db`, and the research/claims/evidence layer.

## File structure

```
~/health-core/
├── data/
│   └── core.db                      # the Health Core (SQLite, WAL)
├── snapshots/
│   └── shred.db.snapshot-<ts>       # pre-build consistent snapshot (rollback safety)
├── schema.sql                       # GENERATED full DDL (node scripts/dump-schema.mjs); source of truth = coredb.mjs + migrations
├── ROLLBACK.md                      # rollback runbook
├── README.md                        # this file
└── scripts/
    ├── lib/
    │   ├── aggregate.mjs            # CANONICAL pure formulas (mirrored in shred/api/core.js)
    │   └── coredb.mjs               # schema, seed catalog, upsert SQL, source lookup
    ├── init-db.mjs                  # create schema + seed sources/metric_types (idempotent)
    ├── backfill.mjs                 # history shred.db -> core.db (--dry-run | write; idempotent)
    ├── validate.mjs                 # validation + reconciliation queries
    ├── snapshot.mjs                 # online-backup snapshot of shred.db
    ├── test-dualwrite.mjs           # reversible live end-to-end dual-write test
    └── probe.mjs / probe2.mjs       # read-only shred.db inspection (Step 0)
```

App-side changes (the only changes outside `~/health-core/`):

- `shred/api/core.js` — **new** dual-write module (best-effort, self-guarding).
- `shred/api/routes/sync.js` — import + one guarded `dualWrite(acceptedRecords)`
  call after the primary commit; collects accepted records. Nothing else changed.
- `shred/docker-compose.yml` — mounts `~/health-core/data → /core` and sets
  `CORE_DB=/core/core.db` for `shred-api`.

All scripts run inside the `shred-shred-api` image so they reuse the exact
`better-sqlite3` build the app uses (no new DB engine). They resolve the module
from `/app/node_modules` via `createRequire`.

## Step 0 — the four facts found in `shred.db`

1. **`weights` columns:** `day, kg, updated_at` → **weight only, no body
   measurements** (no waist/hip/chest/arm). → `body.waist/hip/chest/arm` metric
   types were **not** seeded (additive-only: add them if/when the data appears).
2. **`foods` structure:** one row per program-day; `value` is opaque JSON of
   line items per meal slot — `{ontbijt:[{productId,grams,addedAt}], lunch, snack,
   diner}`. **Not** pre-aggregated → macros are summed per day by joining each
   item's `productId` against the `products` table (`kcal/p/c/f Per100g`).
3. **`sets` timestamp:** **no per-set timestamp** — only a program-`day` index
   (PK `(ex_id, day)`); `sets` is a JSON array `[{w,r}]` of weight/reps strings.
   → session volume is aggregated **per day**. No `rpe` field anywhere →
   `fitness.session_rpe_avg` was **not** seeded.
4. **Primary key per table / `external_id` basis:** `weights.day`,
   `foods.day`, `sets.(ex_id, day)`. Day index → calendar date via
   `meta.startDate = 2026-06-01` (mirrors client `dateForDay`: start + (day-1)).
   external_ids: `weights:<day>`, `foods-day:<date>`, `session:<date>`.

### Categorisation (where each value lands)

- **Raw** → `body.weight` (no derived tag).
- **Module aggregate** (core can't recompute; inputs live in `sets`/`foods`) →
  `observations` **with** a derived tag in metadata:
  `nutrition.*` → `{derived_from:'shred.foods', aggregation_window:'day', formula_version:'nutrition_day_v1'}`;
  `fitness.session_volume` → `{derived_from:'shred.sets', aggregation_window:'day', formula_version:'session_volume_day_v1'}`.
- Core-computed derivations → `derived_metrics` (not used in Fase A).

## Seeded catalog v1

- **sources:** `manual`(user), `shred`(module), `apple_health`(device, reserved),
  `lab`(reserved). Backfill is **not** a source — history is written under
  `shred` with `metadata.imported_by='backfill'`.
- **metric_types (active):** `body.weight` (kg), `fitness.session_volume` (kg),
  `nutrition.calories` (kcal), `nutrition.protein` (g), `nutrition.carbs` (g),
  `nutrition.fat` (g). Conditional keys not present in the data
  (`body.*` measures, `fitness.session_rpe_avg`) were intentionally skipped.

## Migrated counts (backfill result)

| metric_type | rows | notes |
|---|---|---|
| body.weight | 2 | == source `weights` rows |
| nutrition.calories / protein / carbs / fat | 4 each | one per logged foods-day (days with ≥1 item) |
| fitness.session_volume | 3 | sets-days with volume > 0 (2 placeholder/0-volume days skipped) |
| **total** | **21** | |

Second backfill run: **0 new rows, 0 writes** (idempotent via the LWW conflict
clause).

## Validation result

`validate.mjs` → **14 passed, 0 failed**, including:

- counts per metric_type; `body.weight` count == source weights count.
- first/last `timestamp` per metric_type match source-derived date ranges.
- min/max plausibility — `body.weight` 78.5–79 kg (inside 30–300; catches kg↔g).
- no orphan metric_types; no duplicate UNIQUE keys.
- **independent reconciliation:** weights, one foods-day (kcal 1440.55, p 181.77,
  c 67.5, f 53.08) and one sets-day (volume 6936.5) recomputed from source ==
  core.
- provenance: 21/21 rows tagged `imported_by='backfill'`.

Live dual-write verified end-to-end (`test-dualwrite.mjs`): a throwaway POST on an
impossible day exercised all three branches, mirrored 6 correct metrics tagged
`source_path='live'`, and was fully cleaned up with **zero residue** — existing
sync (GET = 93 records, POST response shape) unchanged.

## Operations

Run any script (read-only mounts where possible):

```bash
docker run --rm -v /home/peter/shred/data:/data:ro -v /home/peter/health-core:/health-core \
  -e SHRED_DB=/data/shred.db -e CORE_DB=/health-core/data/core.db \
  shred-shred-api node /health-core/scripts/<init-db|backfill|validate>.mjs [--dry-run]
```

Rollback: see `ROLLBACK.md`. TL;DR — core is fully derivable from `shred.db`:
wipe `core.db` and re-run backfill, or remove `~/health-core` and revert the
three app-side changes; `shred.db` is untouched either way.
