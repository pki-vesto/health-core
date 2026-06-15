// Recommendation lifecycle (issue #33). Exercises both the HTTP routes
// (POST :rec_key/action, GET /actions) and the read-path filter in
// decisionSupport(): dismissed/done hide forever, future snoozes hide until
// expiry, expired snoozes resurface, wording invariants stay intact.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import express from 'express';
import { buildDb, insertObs, harness } from './fixtures.mjs';
import { decisionSupport, recKey, DECISION_DISCLAIMER, isRecHiddenByAction } from '../lib/health-os.js';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

export async function run() {
  const t = harness('recommendation actions (#33)');

  const tmp = buildDb();
  const path = tmp.__path;
  const today = tmp.prepare("SELECT date('now') AS d").get().d;
  // Seed enough to produce two biomarker recs + a stress rec.
  insertObs(tmp, { metric: 'blood.crp', date: today, value: 5.0, source: 'lab' });
  insertObs(tmp, { metric: 'blood.vitamin_d', date: today, value: 40, source: 'lab' });
  insertObs(tmp, { metric: 'stress.perceived', date: today, value: 100 });
  insertObs(tmp, { metric: 'heart.hrv_sdnn', date: today, value: 45 });
  insertObs(tmp, { metric: 'sleep.duration', date: today, value: 5 });
  insertObs(tmp, { metric: 'heart.resting_rate', date: today, value: 100 });
  try { tmp.close(); } catch {}

  process.env.CORE_DB = path;
  const { db, writeDb, __resetForTests } = await import('../db.js');
  __resetForTests(); // briefing-routes test ran first and pinned the old path
  const { recommendations } = await import('../routes/recommendations.js');

  const app = express();
  app.use(express.json());
  app.use('/api/v1', recommendations);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/api/v1`;

  const post = (key, body) => fetch(`${base}/recommendations/${encodeURIComponent(key)}/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  try {
    const crpKey = recKey({ type: 'biomarker', metric: 'blood.crp' });
    const vitdKey = recKey({ type: 'biomarker', metric: 'blood.vitamin_d' });
    const stressKey = recKey({ type: 'stress', subject: 'overall' });

    // Baseline: all three recs surface, disclaimer intact, every rec informational.
    let ds = decisionSupport(db());
    t.eq('baseline: three recs', ds.recommendations.length, 3);
    t.eq('baseline: keys are deterministic',
      new Set(ds.recommendations.map(r => r.rec_key)), new Set([crpKey, vitdKey, stressKey]));
    t.ok('baseline: still informational only', ds.recommendations.every(r => r.informational === true));
    t.eq('baseline: disclaimer intact', ds.note, DECISION_DISCLAIMER);

    // ── 1. valid acknowledge → 201, row inserted ─────────────────────────────
    const ack = await post(crpKey, { status: 'acknowledged', note: 'will retest' });
    t.eq('acknowledged → 201', ack.status, 201);
    const ackBody = await ack.json();
    t.ok('acknowledged returns id + rec_key', ackBody.ok && ackBody.id > 0 && ackBody.rec_key === crpKey);

    // ── 2. validation 400s ───────────────────────────────────────────────────
    t.eq('unknown status → 400', (await post(crpKey, { status: 'bogus' })).status, 400);
    t.eq('snoozed without snooze_until → 400', (await post(crpKey, { status: 'snoozed' })).status, 400);
    t.eq('past snooze_until → 400', (await post(crpKey, { status: 'snoozed', snooze_until: '2000-01-01T00:00:00+02:00' })).status, 400);
    t.eq('non-snooze + snooze_until → 400',
      (await post(crpKey, { status: 'acknowledged', snooze_until: '2099-01-01T00:00:00+02:00' })).status, 400);
    t.eq('invalid rec_key shape → 400',
      (await post('!!bad chars!!', { status: 'done' })).status, 400);

    // Acknowledged still surfaces (acknowledged != hidden).
    ds = decisionSupport(db());
    t.ok('acknowledged still surfaces (lifecycle != hidden)',
      ds.recommendations.some(r => r.rec_key === crpKey));

    // ── 3. dismissed hides ───────────────────────────────────────────────────
    t.eq('dismiss → 201', (await post(crpKey, { status: 'dismissed' })).status, 201);
    ds = decisionSupport(db());
    t.ok('dismissed rec hidden from active surface',
      !ds.recommendations.some(r => r.rec_key === crpKey));
    t.eq('two recs remain after dismiss', ds.recommendations.length, 2);

    // ── 4. done hides ────────────────────────────────────────────────────────
    t.eq('done → 201', (await post(vitdKey, { status: 'done' })).status, 201);
    ds = decisionSupport(db());
    t.ok('done rec hidden',
      !ds.recommendations.some(r => r.rec_key === vitdKey));
    t.eq('one rec remains after dismiss+done', ds.recommendations.length, 1);
    t.ok('wording invariants preserved after lifecycle filter',
      ds.recommendations.every(r => r.informational === true) && ds.note === DECISION_DISCLAIMER);

    // ── 5. snooze hides until expiry; expired snooze surfaces again ──────────
    // Use a far-future literal so the test is timezone-independent — and so an
    // "active snooze" semantically lasts the full lifetime of this test run.
    const future = '2099-01-01T00:00:00+02:00';
    t.eq('snooze future → 201', (await post(stressKey, { status: 'snoozed', snooze_until: future })).status, 201);
    ds = decisionSupport(db());
    t.ok('snoozed rec hidden while in future',
      !ds.recommendations.some(r => r.rec_key === stressKey));

    // Simulate snooze expiry by writing a *new* snooze in the past via writeDb,
    // which becomes the latest action (id ordering) — proves "latest wins" and
    // proves an expired snooze resurfaces the rec.
    writeDb().prepare(
      `INSERT INTO recommendation_actions (rec_key, status, snooze_until, created_at)
       VALUES (?, 'snoozed', ?, datetime('now'))`
    ).run(stressKey, '2000-01-01T00:00:00+02:00');
    ds = decisionSupport(db());
    t.ok('expired snooze (latest row) lets rec resurface',
      ds.recommendations.some(r => r.rec_key === stressKey));

    // ── 6. GET /actions returns history DESC; ?rec_key filter narrows ────────
    const allActions = await fetch(`${base}/recommendations/actions`).then(r => r.json());
    t.ok('GET /actions returns array', Array.isArray(allActions.actions) && allActions.actions.length >= 5);
    const ts = allActions.actions.map(a => `${a.created_at}#${a.id}`);
    const sorted = [...ts].sort().reverse();
    t.eq('actions ordered DESC by created_at,id', ts, sorted);

    const onlyCrp = await fetch(`${base}/recommendations/actions?rec_key=${encodeURIComponent(crpKey)}`).then(r => r.json());
    t.ok('?rec_key filter narrows to that key',
      onlyCrp.actions.length >= 2 && onlyCrp.actions.every(a => a.rec_key === crpKey));

    // ── 7. isRecHiddenByAction unit checks ───────────────────────────────────
    t.eq('no action → not hidden', isRecHiddenByAction(undefined), false);
    t.eq('acknowledged → not hidden', isRecHiddenByAction({ status: 'acknowledged' }), false);
    t.eq('dismissed → hidden', isRecHiddenByAction({ status: 'dismissed' }), true);
    t.eq('done → hidden', isRecHiddenByAction({ status: 'done' }), true);
    t.eq('snoozed past until → not hidden',
      isRecHiddenByAction({ status: 'snoozed', snooze_until: '2000-01-01T00:00:00+02:00' }, '2026-06-15T08:00:00+02:00'), false);
    t.eq('snoozed future until → hidden',
      isRecHiddenByAction({ status: 'snoozed', snooze_until: '2099-01-01T00:00:00+02:00' }, '2026-06-15T08:00:00+02:00'), true);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().then(failed => process.exit(failed ? 1 : 0));
}
