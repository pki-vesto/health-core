import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, harness, insertObs } from './fixtures.mjs';
import * as q from '../lib/query.js';
import { verifyCoreBackup } from '../../scripts/backup-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

export function run() {
  const t = harness('core export + backup');
  const db = buildDb();
  const backupPath = `/tmp/core-backup-test-${process.pid}.db`;

  try {
    insertObs(db, { metric: 'body.weight', date: '2026-01-01', value: 80, source: 'manual', metadata: { note: 'first' } });
    insertObs(db, { metric: 'body.weight', date: '2026-01-02', value: 81, source: 'manual', metadata: { note: 'second' } });
    insertObs(db, { metric: 'nutrition.calories', date: '2026-01-02', value: 2200, source: 'shred' });

    const all = [...q.exportObservations(db, {})].map(q.exportRow);
    t.eq('NDJSON helper exports every observation', all.length, 3);
    t.eq('export order is stable oldest-first', all.map((r) => r.external_id), [
      'manual:body.weight:2026-01-01',
      'manual:body.weight:2026-01-02',
      'shred:nutrition.calories:2026-01-02'
    ]);
    t.eq('metadata is parsed', all[0].metadata, { note: 'first' });

    const filtered = q.exportObservationsJson(db, { metric: 'body.weight', from: '2026-01-02', to: '2026-01-02', source: 'manual' });
    t.eq('JSON export filters match observations filters', filtered.observations.map((r) => r.value), [81]);
    t.eq('JSON export reports count', filtered.count, 1);
    t.throws('JSON export rejects oversized ranges with 413', () => q.exportObservationsJson(db, { max: '2' }), 413);
    t.throws('export rejects unknown metric with 400', () => q.exportObservationCount(db, { metric: 'does.not.exist' }), 400);

    const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'backup-core.mjs')], {
      cwd: ROOT,
      env: { ...process.env, CORE_DB: db.__path, CORE_BACKUP_OUT: backupPath },
      encoding: 'utf8'
    });
    const counts = verifyCoreBackup(backupPath);
    t.ok('backup script reports success', out.includes('core backup OK ->') && out.includes('verify:'), out);
    t.eq('backup has matching observation count', counts.observations, 3);
    t.ok('backup has seeded metric/source catalogs', counts.metric_types >= 60 && counts.sources >= 4, JSON.stringify(counts));
  } finally {
    closeDb(db);
    rmSync(backupPath, { force: true });
  }

  return t.summary();
}
