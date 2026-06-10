// Source-precedence policy tests (ADR-008) + its interaction with LWW.
// Covers the comparator, the canonical /observations/latest picker, the
// dashboard-card picker, and the biomarker latest picker.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, insertObs, harness } from './fixtures.mjs';
import { latestPerMetric, sourceRank, preferLatest } from '../lib/query.js';
import { dashboard } from '../lib/intelligence.js';
import { biomarkerScorecard } from '../lib/health-os.js';

const TO = '2026-03-01';

export function run() {
  const t = harness('source precedence + LWW (ADR-008)');

  // ── comparator units ───────────────────────────────────────────────────────
  t.eq('rank order manual<lab<apple<shred<health_core', [sourceRank('manual'), sourceRank('lab'), sourceRank('apple_health'), sourceRank('shred'), sourceRank('health_core')], [0, 1, 2, 3, 4]);
  t.eq('unknown source ranks last', sourceRank('mystery'), 5);
  t.ok('manual beats shred regardless of stamp', preferLatest({ source: 'manual', source_updated_at: '2026-01-01' }, { source: 'shred', source_updated_at: '2026-12-31' }));
  t.ok('lab beats apple_health', preferLatest({ source: 'lab' }, { source: 'apple_health' }));
  t.ok('within source, newer source_updated_at wins (LWW)', preferLatest({ source: 'manual', source_updated_at: '2026-02-02' }, { source: 'manual', source_updated_at: '2026-02-01' }));
  t.ok('within source, older stamp loses', !preferLatest({ source: 'manual', source_updated_at: '2026-02-01' }, { source: 'manual', source_updated_at: '2026-02-02' }));

  // ── /observations/latest: higher trust wins same day even if it wrote first ──
  {
    const db = buildDb();
    insertObs(db, { metric: 'body.weight', date: TO, value: 80, source: 'shred', sourceUpdatedAt: '2026-03-01T12:00:00.000Z' });
    insertObs(db, { metric: 'body.weight', date: TO, value: 82, source: 'manual', sourceUpdatedAt: '2026-03-01T06:00:00.000Z' });
    const [row] = latestPerMetric(db, { metrics: 'body.weight' });
    t.eq('manual wins over fresher shred', { value: row.value, source: row.source }, { value: 82, source: 'manual' });
    closeDb(db);
  }
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.glucose', date: TO, value: 5.5, source: 'apple_health', sourceUpdatedAt: '2026-03-01T12:00:00.000Z' });
    insertObs(db, { metric: 'blood.glucose', date: TO, value: 5.0, source: 'lab', sourceUpdatedAt: '2026-03-01T06:00:00.000Z' });
    const [row] = latestPerMetric(db, { metrics: 'blood.glucose' });
    t.eq('lab wins over apple_health', { value: row.value, source: row.source }, { value: 5.0, source: 'lab' });
    closeDb(db);
  }

  // ── latest DAY still wins first: stale high-trust value does NOT override ────
  {
    const db = buildDb();
    insertObs(db, { metric: 'body.weight', date: '2026-02-28', value: 99, source: 'manual' });
    insertObs(db, { metric: 'body.weight', date: TO, value: 80, source: 'shred' });
    const [row] = latestPerMetric(db, { metrics: 'body.weight' });
    t.eq('fresher day beats stale high-trust', { value: row.value, source: row.source, ts: row.timestamp }, { value: 80, source: 'shred', ts: TO });
    closeDb(db);
  }

  // ── within same source, LWW resolves (newer source_updated_at) ─────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'body.weight', date: TO, value: 80, source: 'manual', externalId: 'm:a', sourceUpdatedAt: '2026-03-01T06:00:00.000Z' });
    insertObs(db, { metric: 'body.weight', date: TO, value: 85, source: 'manual', externalId: 'm:b', sourceUpdatedAt: '2026-03-01T20:00:00.000Z' });
    const [row] = latestPerMetric(db, { metrics: 'body.weight' });
    t.eq('newer same-source value wins', row.value, 85);
    closeDb(db);
  }

  // ── dashboard card picker honours precedence ───────────────────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'body.weight', date: TO, value: 80, source: 'shred', sourceUpdatedAt: '2026-03-01T12:00:00.000Z' });
    insertObs(db, { metric: 'body.weight', date: TO, value: 82, source: 'manual', sourceUpdatedAt: '2026-03-01T06:00:00.000Z' });
    const card = dashboard(db, { to: TO, days: 30 }).cards.find(c => c.metric === 'body.weight');
    t.eq('dashboard card uses authoritative value', card.latest.value, 82);
    closeDb(db);
  }

  // ── biomarker latest collapses multi-source to one authoritative row ────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.glucose', date: '2026-02-15', value: 6.0, source: 'apple_health' }); // would be high
    insertObs(db, { metric: 'blood.glucose', date: '2026-02-15', value: 5.0, source: 'lab' });            // normal, higher trust
    const s = biomarkerScorecard(db, { to: TO });
    t.eq('counted once, lab value used (normal)', { measured: s.measured, scored: s.scored, normal: s.normal }, { measured: 1, scored: 1, normal: 1 });
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
