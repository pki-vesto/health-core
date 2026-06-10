// Deterministic fixture unit tests for api/lib/health-os.js — biomarker
// scorecard/abnormal detection, sex-specific reference selection, stress scoring
// and briefing logic. Reference ranges come from migration 004 (seeded by buildDb).
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, insertObs, seedDaily, harness } from './fixtures.mjs';
import {
  biomarkerScorecard, abnormalBiomarkers, biomarkerTrends, cardiometabolicScore,
  stressSummary, brief, decisionSupport
} from '../lib/health-os.js';

const TO = '2026-03-01';
const D = '2026-02-01'; // within the 365-day biomarker window

export function run() {
  const t = harness('health-os.js (fixtures)');

  // ── biomarkerScorecard: normal-in-optimal-range count ──────────────────────
  // apob 0.7 ≤0.8 normal; ldl 2.0 ≤2.6 normal; glucose 6.0 >5.2 abnormal;
  // crp 2.0 >1.0 abnormal → 2/4 normal → score 50.
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.apob', date: D, value: 0.7, source: 'lab' });
    insertObs(db, { metric: 'blood.ldl_cholesterol', date: D, value: 2.0, source: 'lab' });
    insertObs(db, { metric: 'blood.glucose', date: D, value: 6.0, source: 'lab' });
    insertObs(db, { metric: 'blood.crp', date: D, value: 2.0, source: 'lab' });
    const s = biomarkerScorecard(db, { to: TO });
    t.eq('scorecard counts', { measured: s.measured, scored: s.scored, normal: s.normal, score: s.score },
      { measured: 4, scored: 4, normal: 2, score: 50 });
    closeDb(db);
  }

  // ── abnormalBiomarkers: status + ordering ──────────────────────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.apob', date: D, value: 0.7, source: 'lab' });   // normal
    insertObs(db, { metric: 'blood.crp', date: D, value: 2.0, source: 'lab' });     // high
    insertObs(db, { metric: 'blood.glucose', date: D, value: 6.0, source: 'lab' }); // high
    const ab = abnormalBiomarkers(db, { to: TO }).abnormal.map(a => ({ metric: a.metric, status: a.status }));
    t.eq('abnormal set', ab, [
      { metric: 'blood.crp', status: 'high' },
      { metric: 'blood.glucose', status: 'high' }
    ]);
    closeDb(db);
  }

  // ── referenceFor honours sex: HDL 1.3 is normal for male (≥1.2) but low for
  //    female (≥1.4). ───────────────────────────────────────────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.hdl_cholesterol', date: D, value: 1.3, source: 'lab' });
    const male = abnormalBiomarkers(db, { to: TO, sex: 'male' }).abnormal;
    const female = abnormalBiomarkers(db, { to: TO, sex: 'female' }).abnormal.map(a => ({ metric: a.metric, status: a.status }));
    t.eq('HDL 1.3 normal for male', male, []);
    t.eq('HDL 1.3 low for female', female, [{ metric: 'blood.hdl_cholesterol', status: 'low' }]);
    closeDb(db);
  }

  // ── stressScore: per-metric thresholds, mean over signals ──────────────────
  // perceived 40, hrv 45(<50→70), sleep 6(<7→70), rhr 60 → mean(40,70,70,60)=60
  {
    const db = buildDb();
    insertObs(db, { metric: 'stress.perceived', date: '2026-02-25', value: 40 });
    insertObs(db, { metric: 'heart.hrv_sdnn', date: '2026-02-25', value: 45 });
    insertObs(db, { metric: 'sleep.duration', date: '2026-02-25', value: 6 });
    insertObs(db, { metric: 'heart.resting_rate', date: '2026-02-25', value: 60 });
    const s = stressSummary(db, { to: TO, days: 30 });
    t.eq('stress score = 60', s.score, 60);
    t.eq('no stress alert below 70', s.alerts, []);
    closeDb(db);
  }

  // ── stress elevated (medium) and high alert branches ───────────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'stress.perceived', date: '2026-02-25', value: 90 });
    insertObs(db, { metric: 'heart.hrv_sdnn', date: '2026-02-25', value: 45 });   // 70
    insertObs(db, { metric: 'sleep.duration', date: '2026-02-25', value: 6 });     // 70
    insertObs(db, { metric: 'heart.resting_rate', date: '2026-02-25', value: 80 }); // 80
    const s = stressSummary(db, { to: TO, days: 30 });                              // mean=77.5
    t.eq('stress score = 77.5', s.score, 77.5);
    t.eq('medium stress alert', s.alerts, [{ type: 'chronic_stress_risk', score: 77.5, severity: 'medium' }]);
    closeDb(db);
  }
  {
    const db = buildDb();
    insertObs(db, { metric: 'stress.perceived', date: '2026-02-25', value: 100 });
    insertObs(db, { metric: 'heart.hrv_sdnn', date: '2026-02-25', value: 45 });    // 70
    insertObs(db, { metric: 'sleep.duration', date: '2026-02-25', value: 5 });      // 70
    insertObs(db, { metric: 'heart.resting_rate', date: '2026-02-25', value: 100 }); // 100
    const s = stressSummary(db, { to: TO, days: 30 });                               // mean=85
    t.eq('high stress alert at 85', s.alerts, [{ type: 'chronic_stress_risk', score: 85, severity: 'high' }]);
    closeDb(db);
  }

  // ── biomarkerTrend stats ───────────────────────────────────────────────────
  {
    const db = buildDb();
    seedDaily(db, 'blood.glucose', '2026-02-10', [5.0, 5.5, 6.0], { source: 'lab' });
    const tr = biomarkerTrends(db, { to: TO, metrics: 'blood.glucose' }).trends[0];
    t.eq('biomarker trend stats', { n: tr.n, avg: tr.avg, min: tr.min, max: tr.max, latest: tr.latest.value },
      { n: 3, avg: 5.5, min: 5, max: 6, latest: 6 });
    closeDb(db);
  }

  // ── cardiometabolicScore: all normal → 100 ─────────────────────────────────
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.apob', date: D, value: 0.7, source: 'lab' });
    insertObs(db, { metric: 'blood.glucose', date: D, value: 5.0, source: 'lab' });
    insertObs(db, { metric: 'blood.hba1c', date: D, value: 5.0, source: 'lab' });
    insertObs(db, { metric: 'blood.crp', date: D, value: 0.5, source: 'lab' });
    insertObs(db, { metric: 'blood.triglycerides', date: D, value: 1.0, source: 'lab' });
    const c = cardiometabolicScore(db, { to: TO });
    t.eq('cardiometabolic score 100', c.score, 100);
    t.eq('cardiometabolic model', c.model, 'reference-range-normal-count');
    closeDb(db);
  }

  // ── brief: period→days mapping + shape; unknown period rejected ────────────
  {
    const db = buildDb();
    const today = db.prepare("SELECT date('now') AS d").get().d;
    insertObs(db, { metric: 'body.weight', date: today, value: 80 });
    const b = brief(db, 'weekly');
    t.eq('brief period', b.period, 'weekly');
    t.ok('brief has summary', !!b.summary && 'recovery' in b.summary);
    t.ok('brief highlights ≤6', Array.isArray(b.highlights) && b.highlights.length <= 6);
    t.ok('brief decisions array', Array.isArray(b.decisions));
    t.ok('brief generated_at ISO', typeof b.generated_at === 'string' && b.generated_at.includes('T'));
    t.throws('brief unknown period → 400', () => brief(db, 'fortnightly'), 400);
    closeDb(db);
  }

  // ── decisionSupport surfaces abnormal biomarkers, stays informational ──────
  {
    const db = buildDb();
    insertObs(db, { metric: 'blood.crp', date: D, value: 5.0, source: 'lab' }); // high
    const ds = decisionSupport(db);
    const crp = ds.recommendations.find(r => r.type === 'biomarker' && r.message.includes('C-reactive protein'));
    t.eq('biomarker recommendation', crp && { type: crp.type, priority: crp.priority }, { type: 'biomarker', priority: 'review' });
    t.ok('decision support carries non-clinical note', /does not replace medical advice/i.test(ds.note));
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
