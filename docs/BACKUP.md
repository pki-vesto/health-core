# Health Core Backup and Restore

Health Core stores canonical health history in local SQLite at
`data/core.db`. Backups are local files only; there is no cloud upload or remote
sync.

## Create a Core DB Backup

Run the backup while the API is up or down:

```bash
cd ~/health-core
NODE_MODULES_BASE=$PWD/api/node_modules/ CORE_DB=$PWD/data/core.db \
  node scripts/backup-core.mjs
```

The script opens the live Core read-only, uses SQLite's online backup API, and
writes:

```text
snapshots/core.db.backup-<UTC-timestamp>
```

It then re-opens the backup read-only and prints sanity counts for
`observations`, `metric_types`, and `sources`.

To choose an explicit output path:

```bash
CORE_BACKUP_OUT=/safe/offbox/core.db.backup-$(date -u +%Y%m%dT%H%M%SZ) \
  NODE_MODULES_BASE=$PWD/api/node_modules/ CORE_DB=$PWD/data/core.db \
  node scripts/backup-core.mjs
```

## Export Observations

For a portable observations dump:

```bash
curl http://localhost:8091/api/v1/export/observations > observations.ndjson
```

If bearer auth is enabled:

```bash
curl -H "Authorization: Bearer $CORE_BEARER_TOKEN" \
  http://localhost:8091/api/v1/export/observations > observations.ndjson
```

Use JSON only for smaller ranges:

```bash
curl "http://localhost:8091/api/v1/export/observations.json?from=2026-01-01&to=2026-01-31" \
  > observations.json
```

## Restore a Core DB Backup

Restore is intentionally manual:

```bash
cd ~/health-core
docker compose stop core-api
cp data/core.db data/core.db.broken-$(date -u +%Y%m%dT%H%M%SZ)
cp snapshots/core.db.backup-<UTC-timestamp> data/core.db
rm -f data/core.db-wal data/core.db-shm
docker compose start core-api
```

After restart:

```bash
curl http://localhost:8091/api/health
BASE=http://localhost:8091 node api/test/smoke.mjs
```

Do not restore a backup over a running writer. Stop the API first so every
connection reopens against the restored file.
