// Tests that medical decision-support stays informational and non-clinical
// (task #17): observational messages only — no directives/prescriptions/
// diagnoses — and the non-clinical disclaimer travels with every surface.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, insertObs, harness } from './fixtures.mjs';
import { decisionSupport, brief, DECISION_DISCLAIMER } from '../lib/health-os.js';

// Clinical directives / diagnostic claims that must never appear in a message.
const FORBIDDEN = /\b(you should|you must|prescrib\w*|diagnos\w*|medication|medicine|dosage|dose|cure[sd]?|treat\b|treatment|take \d)\b/i;
const ALLOWED_PRIORITIES = new Set(['monitor', 'review']);

export function run() {
  const t = harness('decision-support wording (informational only)');

  const db = buildDb();
  const today = db.prepare("SELECT date('now') AS d").get().d;
  insertObs(db, { metric: 'blood.crp', date: today, value: 5.0, source: 'lab' });        // high → review
  insertObs(db, { metric: 'blood.vitamin_d', date: today, value: 40, source: 'lab' });    // low  → monitor
  insertObs(db, { metric: 'stress.perceived', date: today, value: 100 });
  insertObs(db, { metric: 'heart.hrv_sdnn', date: today, value: 45 });
  insertObs(db, { metric: 'sleep.duration', date: today, value: 5 });
  insertObs(db, { metric: 'heart.resting_rate', date: today, value: 100 });               // stress score 85 → review

  const ds = decisionSupport(db);

  t.eq('three recommendations', ds.recommendations.length, 3);
  t.ok('all flagged informational', ds.recommendations.every(r => r.informational === true));
  t.ok('priorities are monitor/review only', ds.recommendations.every(r => ALLOWED_PRIORITIES.has(r.priority)));
  t.ok('no clinical directives in any message', ds.recommendations.every(r => !FORBIDDEN.test(r.message)), JSON.stringify(ds.recommendations.map(r => r.message)));
  t.ok('messages are non-empty strings', ds.recommendations.every(r => typeof r.message === 'string' && r.message.length > 0));

  const crp = ds.recommendations.find(r => r.message.includes('C-reactive protein'));
  const vitd = ds.recommendations.find(r => r.message.includes('Vitamin D'));
  t.ok('high biomarker phrased "above" + display name', crp && /above its reference range/.test(crp.message) && crp.priority === 'review');
  t.ok('low biomarker phrased "below" + display name', vitd && /below its reference range/.test(vitd.message) && vitd.priority === 'monitor');

  t.eq('note is the canonical disclaimer', ds.note, DECISION_DISCLAIMER);
  t.ok('disclaimer keeps non-clinical phrasing', /does not replace medical advice/i.test(ds.note) && /diagnosis/i.test(ds.note));

  // Disclaimer must travel with briefings too (it surfaces decisions there).
  const b = brief(db, 'daily');
  t.eq('briefing carries disclaimer', b.disclaimer, DECISION_DISCLAIMER);

  closeDb(db);
  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
