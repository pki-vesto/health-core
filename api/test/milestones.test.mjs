import { buildDb, closeDb, harness, insertObs, seedDaily } from './fixtures.mjs';
import { detectMilestones, listMilestones } from '../lib/milestones.js';
import { fileURLToPath } from 'node:url';

export function run() {
  const t = harness('milestone detection');

  {
    const db = buildDb();
    seedDaily(db, 'body.weight', '2026-01-01', [82, 81, 80]);
    seedDaily(db, 'fitness.session_volume', '2026-01-01', [1000, 900, 1400]);
    insertObs(db, { metric: 'blood.apob', date: '2026-01-01', value: 1.2, source: 'lab' });
    insertObs(db, { metric: 'blood.apob', date: '2026-01-15', value: 0.7, source: 'lab' });
    seedDaily(db, 'sleep.duration', '2026-02-01', [7, 7, 7, 7, 7, 7, 7]);

    const first = detectMilestones(db, db);
    t.eq('detects five configured milestones', { detected: first.detected, written: first.written }, { detected: 5, written: 5 });

    const rows = listMilestones(db, { limit: 10 });
    t.eq('persists all milestone categories', rows.map((r) => r.category).sort(), [
      'biomarker_in_range',
      'logging_streak',
      'record_high',
      'record_low',
      'record_low'
    ]);
    t.ok('biomarker milestone has Dutch title', rows.some((r) => r.metric_type === 'blood.apob' && /terug in bereik/.test(r.title)));
    t.ok('streak milestone ends on day seven', rows.some((r) => r.category === 'logging_streak' && r.timestamp === '2026-02-07' && r.value === 7));

    const second = detectMilestones(db, db);
    t.eq('second run is idempotent', { detected: second.detected, written: second.written }, { detected: 5, written: 0 });
    t.eq('no duplicate milestone rows', db.prepare('SELECT COUNT(*) AS n FROM health_milestones').get().n, 5);
    closeDb(db);
  }

  {
    const db = buildDb();
    const out = detectMilestones(db, db);
    t.eq('empty data produces no milestones', { detected: out.detected, written: out.written }, { detected: 0, written: 0 });
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
