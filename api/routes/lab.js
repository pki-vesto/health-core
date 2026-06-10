// Lab-result import routes (Domains 11/12, tasks #7/#8).
//   POST /api/v1/lab/parse  → review a report (map + unit-check + reference status); writes nothing
//   POST /api/v1/lab/commit → record the report and ingest committable results (source 'lab')
//   GET  /api/v1/lab/results → list previously committed reports
// Reads use the read-only connection; commit uses the dedicated RW connection.
import { Router } from 'express';
import { db, writeDb } from '../db.js';
import { parseLab, commitLab } from '../lib/lab.js';
import { BadRequest } from '../lib/query.js';

export const lab = Router();

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) { if (e instanceof BadRequest) res.status(400).json({ error: e.message }); else next(e); }
};

// Optional reviewer context (the single user's sex/age) sharpens reference ranges.
const ctx = (body) => ({ sex: body?.sex, age: body?.age });

lab.post('/lab/parse', wrap((req, res) => {
  res.json(parseLab(db(), req.body || {}, ctx(req.body)));
}));

lab.post('/lab/commit', wrap((req, res) => {
  res.json(commitLab(writeDb(), req.body || {}, ctx(req.body)));
}));

lab.get('/lab/results', wrap((_req, res) => {
  res.json({
    results: db().prepare(
      'SELECT id, collected_at, lab_name, panel, report_id, created_at FROM lab_results ORDER BY collected_at DESC, id DESC LIMIT 200'
    ).all()
  });
}));
