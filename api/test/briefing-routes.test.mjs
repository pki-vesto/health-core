// HTTP route tests for /api/v1/briefing/history, /:id, /:id/diff (issue #32).
// Boots the briefing router in-process against a temp core DB so we exercise
// the actual Express handlers, including 404/400 paths and the no-prior diff
// shape on the first snapshot.
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import express from 'express';
import { buildDb, harness } from './fixtures.mjs';

const require = createRequire(process.env.NODE_MODULES_BASE || '/app/node_modules/');
const Database = require('better-sqlite3');

export async function run() {
  const t = harness('briefing routes (#32)');

  // Build a temp Core DB via fixtures (so all migrations are applied), close it,
  // then point CORE_DB at that path so db.js opens it. dynamic-import the route
  // module *after* setting CORE_DB so the singleton picks up the right path.
  const tmp = buildDb();
  const path = tmp.__path;
  try { tmp.close(); } catch {}

  process.env.CORE_DB = path;
  const { briefing } = await import('../routes/briefing.js?ts=' + Date.now());

  // Seed snapshots through a direct writer (the router uses the read-only db()).
  const w = new Database(path);
  w.pragma('foreign_keys = ON');
  const insert = w.prepare(
    `INSERT INTO briefing_snapshots (period, generated_at, payload, payload_sha256, summary)
     VALUES (?,?,?,?,?)`
  );
  const r1 = insert.run(
    'daily', '2026-06-13T08:00:00+02:00',
    JSON.stringify({ period: 'daily', generated_at: '2026-06-13T08:00:00+02:00',
      summary: { recovery: 60 },
      highlights: [{ metric: 'body.weight', latest: { value: 80 }, trend: { direction: 'flat' } }],
      alerts: [], decisions: [] }),
    'a'.repeat(64), JSON.stringify({ recovery: 60 })
  );
  const r2 = insert.run(
    'daily', '2026-06-14T08:00:00+02:00',
    JSON.stringify({ period: 'daily', generated_at: '2026-06-14T08:00:00+02:00',
      summary: { recovery: 75 },
      highlights: [{ metric: 'body.weight', latest: { value: 81 }, trend: { direction: 'up' } }],
      alerts: [{ type: 'chronic_stress_risk', score: 80, severity: 'high' }],
      decisions: [{ type: 'stress', priority: 'review', message: 'Stress signals elevated' }] }),
    'b'.repeat(64), JSON.stringify({ recovery: 75 })
  );
  insert.run(
    'weekly', '2026-06-14T09:00:00+02:00',
    JSON.stringify({ period: 'weekly', generated_at: '2026-06-14T09:00:00+02:00',
      summary: { recovery: 70 }, highlights: [], alerts: [], decisions: [] }),
    'c'.repeat(64), JSON.stringify({ recovery: 70 })
  );
  w.close();

  const app = express();
  app.use('/api/v1', briefing);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // ── /history ordering + period filter ────────────────────────────────────
    const histAll = await fetch(`${base}/api/v1/briefing/history`).then(r => r.json());
    t.eq('history returns all periods unfiltered', histAll.snapshots.length, 3);
    t.eq('history DESC by generated_at', histAll.snapshots[0].generated_at, '2026-06-14T09:00:00+02:00');

    const histDaily = await fetch(`${base}/api/v1/briefing/history?period=daily`).then(r => r.json());
    t.eq('history filters to period=daily', histDaily.snapshots.map(r => r.period), ['daily', 'daily']);
    t.eq('history.summary parsed back to object', histDaily.snapshots[0].summary, { recovery: 75 });

    const histBad = await fetch(`${base}/api/v1/briefing/history?period=fortnightly`);
    t.eq('unknown period → 400', histBad.status, 400);

    // ── /:id returns stored payload ──────────────────────────────────────────
    const id1 = Number(r1.lastInsertRowid);
    const id2 = Number(r2.lastInsertRowid);
    const one = await fetch(`${base}/api/v1/briefing/${id2}`).then(r => r.json());
    t.eq('GET /:id returns the stored briefing', { id: one.id, period: one.period, recovery: one.snapshot?.summary?.recovery },
      { id: id2, period: 'daily', recovery: 75 });
    t.ok('GET /:id includes payload_sha256', typeof one.payload_sha256 === 'string' && one.payload_sha256.length === 64);

    const missing = await fetch(`${base}/api/v1/briefing/9999`);
    t.eq('unknown id → 404', missing.status, 404);
    const badId = await fetch(`${base}/api/v1/briefing/abc`);
    t.eq('non-numeric id → 400', badId.status, 400);

    // ── /:id/diff — happy path against prior ─────────────────────────────────
    const diff = await fetch(`${base}/api/v1/briefing/${id2}/diff`).then(r => r.json());
    t.eq('diff prior id', diff.prior_id, id1);
    t.eq('diff first=false on second snapshot', diff.diff.first, false);
    t.eq('diff highlights changed body.weight', diff.diff.highlights.changed[0].after,
      { latest_value: 81, trend_direction: 'up' });
    t.eq('diff alerts added high-severity stress', diff.diff.alerts.added.map(a => a.severity), ['high']);

    // ── /:id/diff — first-ever snapshot of its period ────────────────────────
    const firstDiff = await fetch(`${base}/api/v1/briefing/${id1}/diff`).then(r => r.json());
    t.eq('first-ever diff first=true', firstDiff.diff.first, true);
    t.eq('first-ever diff prior_id=null', firstDiff.prior_id, null);

    // ── /:id?diff=prior inline form ──────────────────────────────────────────
    const inline = await fetch(`${base}/api/v1/briefing/${id2}?diff=prior`).then(r => r.json());
    t.ok('inline diff returns snapshot + diff', inline.snapshot && inline.diff && inline.diff.first === false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    for (const ext of ['', '-wal', '-shm']) rmSync(path + ext, { force: true });
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().then(failed => process.exit(failed ? 1 : 0));
}
