// Golden reference tests for core intelligence math: baselines, correlations,
// readiness, recovery scoring and risk detection. Expected values live in JSON
// so changes to the formulas have to update an explicit reference set.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildDb, closeDb, seedDaily, harness } from './fixtures.mjs';
import { correlations, experimentReadiness, recoverySummary } from '../lib/intelligence.js';
import { baselines, risks } from '../lib/platform.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = JSON.parse(readFileSync(join(HERE, 'fixtures', 'intelligence-golden.json'), 'utf8'));
const TO = GOLDEN.meta.to;

export function run() {
  const t = harness('intelligence golden references');

  for (const g of GOLDEN.baselines) {
    const db = buildDb();
    seedDaily(db, g.metric, g.start, g.values);
    const out = baselines(db, { to: TO, days: 365 }).baselines.find(x => x.metric === g.metric);
    t.eq(`baseline: ${g.name}`, out, g.expected);
    closeDb(db);
  }

  for (const g of GOLDEN.correlations) {
    const db = buildDb();
    seedDaily(db, g.xMetric, g.start, g.x);
    seedDaily(db, g.yMetric, g.start, g.y);
    const out = correlations(db, { to: TO, days: 90, metrics: `${g.xMetric},${g.yMetric}` }).correlations[0];
    t.eq(`correlation: ${g.name}`, out, g.expected);
    closeDb(db);
  }

  {
    const db = buildDb();
    const g = GOLDEN.readiness;
    seedDaily(db, g.metric, g.start, g.values);
    const out = experimentReadiness(db).candidate_metrics.find(m => m.key === g.metric);
    t.eq(`readiness: ${g.name}`, { n: out.n, ready: out.ready }, g.expected);
    closeDb(db);
  }

  {
    const db = buildDb();
    const g = GOLDEN.risk;
    seedDaily(db, g.metric, g.start, g.values, { source: g.source });
    const out = risks(db, { to: TO, days: 365 });
    t.eq(`risk: ${g.name}`, {
      indicatorTypes: out.indicators.map(i => i.type).sort(),
      risk_score: out.risk_score,
      metabolic: out.metabolic.length,
      cardiovascular: out.cardiovascular.length
    }, g.expected);
    closeDb(db);
  }

  {
    const db = buildDb();
    const g = GOLDEN.scores.recovery;
    for (const s of g.series) seedDaily(db, s.metric, s.start, s.values);
    const out = recoverySummary(db, { to: TO, days: 30 });
    t.eq(`score: ${g.name}`, { recovery_score: out.recovery_score }, g.expected);
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
