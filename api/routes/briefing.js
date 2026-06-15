// Briefing history + diff routes (issue #32).
//   GET /api/v1/briefing/history?period=daily&limit=20 — recent snapshots
//   GET /api/v1/briefing/:id                          — one stored snapshot
//   GET /api/v1/briefing/:id/diff                     — diff vs. prior snapshot
//
// Reads use the read-only connection (db()); the v1 `/briefing/:period`
// generators persist via writeDb() and call into lib/health-os.js
// briefAndSnapshot(). This module is read-only.
//
// Route order matters under Express 5: `/briefing/history` is registered before
// `/briefing/:id` so the literal segment wins over the param. Numeric ids are
// validated inside the handler (no regex param constraints, per Express 5).
import { Router } from 'express';
import { db } from '../db.js';
import { getBriefingSnapshot, listBriefingSnapshots, priorBriefingSnapshot } from '../lib/health-os.js';
import { diffBriefings } from '../lib/briefing-diff.js';
import { BadRequest } from '../lib/query.js';

export const briefing = Router();

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) { if (e instanceof BadRequest) res.status(400).json({ error: e.message }); else next(e); }
};

function parseId(raw) {
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0 || String(n) !== String(raw)) {
    throw new BadRequest('briefing id must be a positive integer');
  }
  return n;
}

briefing.get('/briefing/history', wrap((req, res) => {
  const period = req.query.period ? String(req.query.period) : null;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const rows = listBriefingSnapshots(db(), { period, limit });
  res.json({ period: period || null, snapshots: rows });
}));

briefing.get('/briefing/:id/diff', wrap((req, res) => {
  const id = parseId(req.params.id);
  const current = getBriefingSnapshot(db(), id);
  if (!current) return res.status(404).json({ error: 'briefing snapshot not found' });
  const prior = priorBriefingSnapshot(db(), { period: current.period, id });
  res.json({
    id: current.id,
    period: current.period,
    diff: diffBriefings(prior ? prior.payload : null, current.payload),
    prior_id: prior ? prior.id : null
  });
}));

briefing.get('/briefing/:id', wrap((req, res) => {
  const id = parseId(req.params.id);
  const row = getBriefingSnapshot(db(), id);
  if (!row) return res.status(404).json({ error: 'briefing snapshot not found' });
  if (req.query.diff === 'prior') {
    const prior = priorBriefingSnapshot(db(), { period: row.period, id });
    return res.json({
      id: row.id,
      period: row.period,
      generated_at: row.generated_at,
      snapshot: row.payload,
      diff: diffBriefings(prior ? prior.payload : null, row.payload),
      prior_id: prior ? prior.id : null
    });
  }
  res.json({
    id: row.id,
    period: row.period,
    generated_at: row.generated_at,
    payload_sha256: row.payload_sha256,
    snapshot: row.payload
  });
}));
