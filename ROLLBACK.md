# Health Core — Rollback runbook (Fase A, dual-write)

The Health Core build is **fully additive and reproducible**. Nothing in
`shred.db` was modified beyond what the Shred Tracker app already did, so the app
keeps working no matter what you do to the core. Pick the smallest step that
solves your problem.

## What was changed (the complete blast radius)

| Change | Location | Reversible by |
|---|---|---|
| New core database | `~/health-core/data/core.db` | delete the file |
| New scripts/libs | `~/health-core/scripts/` | delete the dir |
| Dual-write module | `shred/api/core.js` (new file) | delete + rebuild |
| Sync handler hook | `shred/api/routes/sync.js` (3 added lines + import) | revert + rebuild |
| Core mount + env | `shred/docker-compose.yml` (`/core` volume, `CORE_DB`) | revert + `up -d` |

`shred.db` itself: **untouched** (no schema change, no new tables, no triggers).

## Snapshot (taken before any work)

```
~/health-core/snapshots/shred.db.snapshot-<timestamp>
```
Consistent single-file copy made via SQLite's online backup API from a
read-only connection. Only needed in the (not-expected) worst case; see bottom.

---

## Level 0 — Disable dual-write, keep core data

Fastest "make the live path stop touching the core" without losing history.
Dual-write auto-disables when `CORE_DB` is unset.

```bash
cd ~/shred
# comment out the CORE_DB env line (and optionally the /core volume) in
# docker-compose.yml, then:
docker compose up -d shred-api
docker logs --tail 3 shred-api   # expect: [core] CORE_DB unset — dual-write disabled
```

The sync handler still runs exactly as before (the `dualWrite()` call becomes a
no-op). `core.db` is left intact on disk.

## Level 1 — Wipe & rebuild the core (data looks wrong)

Because the core is 100% derivable from `shred.db`, just rebuild it.

```bash
rm -f ~/health-core/data/core.db ~/health-core/data/core.db-wal ~/health-core/data/core.db-shm

# recreate schema + seed, then backfill (idempotent)
docker run --rm -v /home/peter/shred/data:/data:ro -v /home/peter/health-core:/health-core \
  -e SHRED_DB=/data/shred.db -e CORE_DB=/health-core/data/core.db \
  shred-shred-api node /health-core/scripts/init-db.mjs

docker run --rm -v /home/peter/shred/data:/data:ro -v /home/peter/health-core:/health-core \
  -e SHRED_DB=/data/shred.db -e CORE_DB=/health-core/data/core.db \
  shred-shred-api node /health-core/scripts/backfill.mjs            # add --dry-run first to preview

docker run --rm -v /home/peter/shred/data:/data:ro -v /home/peter/health-core:/health-core \
  -e SHRED_DB=/data/shred.db -e CORE_DB=/health-core/data/core.db \
  shred-shred-api node /health-core/scripts/validate.mjs
```

The running `shred-api` keeps its own `core.db` handle; after a wipe+recreate it
re-uses the same file path, but to be safe you can `docker compose restart
shred-api` so it re-opens cleanly. Live sync will simply re-populate going
forward (LWW upsert).

> Note: live-written rows carry `metadata.source_path='live'`; pure backfilled
> rows carry `metadata.imported_by='backfill'`. A backfilled row that live sync
> has since superseded keeps its `imported_by='backfill'` tag (the conflict
> clause updates only value/source_updated_at/updated_at), so "untouched by
> live" = `imported_by='backfill'` **and** its value still matches a fresh
> backfill. A full wipe+rebuild makes the whole table backfill-tagged again.

## Level 2 — Remove the core entirely (back to pre-build state)

```bash
cd ~/shred
# 1. revert the two app-side changes
#    - docker-compose.yml: remove the CORE_DB env line and the /core volume
#    - api/routes/sync.js: remove `import { dualWrite } ...` and the
#      `try { dualWrite(acceptedRecords); } ...` line (and the acceptedRecords
#      collection if you want a byte-identical revert)
#    - delete api/core.js
git checkout -- docker-compose.yml api/routes/sync.js   # if tracked; else edit by hand
rm -f api/core.js

# 2. rebuild + restart the API on the reverted code
docker compose build shred-api && docker compose up -d shred-api

# 3. delete the core tree
rm -rf ~/health-core
```

Result: identical to before this build. `shred.db` was never altered.

## Level 3 — Worst case: restore shred.db from the snapshot

Not expected to ever be needed (shred.db was never written by this build). Only
if `shred.db` is damaged for an unrelated reason:

```bash
cd ~/shred
docker compose stop shred-api
cp data/shred.db data/shred.db.broken-$(date +%Y%m%d-%H%M%S)         # keep the bad copy
cp ~/health-core/snapshots/shred.db.snapshot-<timestamp> data/shred.db
rm -f data/shred.db-wal data/shred.db-shm                            # drop stale WAL
docker compose start shred-api
```
The snapshot reflects the moment Fase A started; any app writes after that
moment would need re-syncing from a client device (last-write-wins makes this
safe).

---

## Sanity checks after any rollback

```bash
# app still serving + sync unchanged
docker exec shred-api node -e 'fetch("http://localhost:8089/api/health").then(r=>r.text()).then(console.log)'
docker exec shred-api node -e 'fetch("http://localhost:8089/api/sync?since=0").then(r=>r.json()).then(j=>console.log("records:",j.records.length))'
```
