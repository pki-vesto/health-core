# Apple Health (Auto Health Export) — import & verification

Status: **tooling ready; awaiting one real device export** (the only remaining
external dependency — see `runtime/BLOCKERS.md`). The mapper is built and tested
against synthetic data; this procedure verifies and imports a *real* export.

## What feeds the Core

The iOS app **Auto Health Export** produces JSON shaped like:

```json
{ "data": { "metrics": [
  { "name": "step_count", "units": "count", "data": [
    { "date": "2026-06-01 09:00:00 +0000", "qty": 8421 } ] }
] } }
```

`api/lib/apple-health.js` maps known metric names → Core metric types, aggregates
to **one value per calendar day** (steps summed, HR/HRV/VO₂max averaged, sleep
totalled), and emits idempotent records keyed `apple:<metric>:<date>`. Currently
mapped: `heart.resting_rate`, `heart.hrv_sdnn`, `fitness.vo2max`,
`activity.steps`, `sleep.duration`.

## Step 1 — export from the phone

In Auto Health Export choose **Export → JSON**, all relevant metrics, the date
range you want, and save/share the `.json` file onto a machine that can reach the
Core (tailnet). Large historical exports are fine — the API accepts up to 50 MB.

## Step 2 — dry-run (verify mapping BEFORE writing anything)

```bash
# in the repo root; runs the same mapper the endpoint uses, writes nothing
node scripts/import-apple-health.mjs path/to/export.json
```

It prints: every mapped metric with day-count and date range, **every unmapped
export name**, and a few sample records so you can eyeball that field names match
the real export. Nothing is written to the Core in this mode.

If you don't have host Node, run it through the API image with the repo + file
mounted:

```bash
docker run --rm -v "$HOME/health-core":/work -v /path/to/dir:/in \
  -w /work health-core-api:latest \
  node scripts/import-apple-health.mjs /in/export.json
```

### If unmapped names appear

The dry-run lists export metric names we don't map yet (e.g. a device may name a
metric slightly differently). For any name that **is** a metric we track, add the
exact lowercased name to `ALIAS` in `api/lib/apple-health.js` pointing at the
right canonical `MAP` key (this is task #6 — additive only, never repurpose a
metric). Re-run the dry-run until the important metrics resolve. Genuinely new
vocabulary (a metric we don't track) is correctly *skipped*, not an error.

## Step 3 — import

```bash
node scripts/import-apple-health.mjs path/to/export.json --post http://localhost:8091 --verify
#   add --token <CORE_BEARER_TOKEN> if bearer auth is enabled
```

This POSTs to `POST /api/v1/ingest/apple-health`. Ingest is **idempotent + LWW**:
re-importing the same export writes 0 rows; a corrected export (new sample times)
updates in place. `--verify` re-queries `/api/v1/stats` and prints the resulting
counts/date-ranges for the imported metrics.

> Do **not** import synthetic/test payloads into the live `core.db` — it is the
> canonical observations store. Use the dry-run for testing; only `--post` a real
> export.

## Step 4 — confirm field-name assumptions

After the first real import, record in this file any real export names that
differed from the canonical ones (and the alias added), and confirm the sleep
field actually used (`asleep` / `totalSleep` / stage split). That closes task #5.

### Observed real-export field names

_(fill in after the first real device export — table of `export name → Core
metric → alias added?`)_
