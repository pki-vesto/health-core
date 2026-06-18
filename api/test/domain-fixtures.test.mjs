import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, harness } from './fixtures.mjs';
import { DOMAIN_FIXTURE_COVERAGE, seedAllDomains } from './seed-domains.mjs';

const TO = '2026-03-01';
const DAYS = 60;

export function run() {
  const t = harness('domain fixture coverage');

  {
    const db = seedAllDomains(buildDb(), { to: TO, days: DAYS });

    const domains = DOMAIN_FIXTURE_COVERAGE.map(d => d.domain);
    t.eq('fixture manifest covers domains 1-25', domains, Array.from({ length: 25 }, (_, i) => i + 1));

    for (const domain of DOMAIN_FIXTURE_COVERAGE) {
      for (const metric of domain.metrics || []) {
        const n = db.prepare('SELECT COUNT(*) AS n FROM observations WHERE metric_type = ?').get(metric).n;
        t.ok(`domain ${domain.domain} metric fixture: ${metric}`, n > 0, `count=${n}`);
      }
      for (const table of domain.tables || []) {
        const n = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
        t.ok(`domain ${domain.domain} table fixture: ${table}`, n > 0, `count=${n}`);
      }
    }

    const unseeded = db.prepare(`
      SELECT mt.key
        FROM metric_types mt
        LEFT JOIN observations o ON o.metric_type = mt.key
       WHERE mt.status = 'active'
       GROUP BY mt.key
      HAVING COUNT(o.id) = 0
       ORDER BY mt.key
    `).all().map(r => r.key);
    t.eq('every active metric has representative observations', unseeded, []);

    const sparseLab = db.prepare(`
      SELECT metric_type, COUNT(*) AS n, COUNT(DISTINCT timestamp) AS days
        FROM observations
       WHERE source = (SELECT id FROM sources WHERE name='lab')
       GROUP BY metric_type
       ORDER BY metric_type
    `).all();
    t.ok('lab fixtures are sparse multi-date data', sparseLab.length >= 12 && sparseLab.every(r => r.n === 3 && r.days === 3), JSON.stringify(sparseLab));

    const symptom = db.prepare("SELECT metadata FROM observations WHERE metric_type='symptom.severity' LIMIT 1").get();
    t.eq('symptom fixture carries category metadata', JSON.parse(symptom.metadata), { symptom: 'headache', category: 'pain' });

    const q = db.prepare('SELECT raw_record, reason, resolved FROM quarantine').get();
    t.eq('quarantine fixture covers incomplete input edge case', {
      metric: JSON.parse(q.raw_record).metric,
      reason: q.reason,
      resolved: q.resolved
    }, { metric: 'activity.steps', reason: 'missing timestamp', resolved: 0 });

    const briefings = db.prepare('SELECT period FROM briefing_snapshots ORDER BY period').all().map(r => r.period);
    t.eq('briefing fixtures cover daily and weekly snapshots', briefings, ['daily', 'weekly']);

    closeDb(db);
  }

  {
    const a = seedAllDomains(buildDb(), { to: TO, days: DAYS });
    const b = seedAllDomains(buildDb(), { to: TO, days: DAYS });
    t.eq('deterministic metric aggregates', metricDigest(a), metricDigest(b));
    t.eq('deterministic table counts', tableDigest(a), tableDigest(b));
    closeDb(a);
    closeDb(b);
  }

  return t.summary();
}

function metricDigest(db) {
  return db.prepare(`
    SELECT metric_type, COUNT(*) AS n,
           ROUND(MIN(value), 4) AS min,
           ROUND(MAX(value), 4) AS max,
           ROUND(AVG(value), 4) AS avg
      FROM observations
     GROUP BY metric_type
     ORDER BY metric_type
  `).all();
}

function tableDigest(db) {
  const tables = [
    'experiments', 'ingest_log', 'quarantine', 'derived_metrics',
    'health_milestones', 'insight_events', 'briefing_snapshots',
    'user_health_goals'
  ];
  return Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
