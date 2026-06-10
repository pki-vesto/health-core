// Lab-result import routes (Domains 11/12, tasks #7/#8).
//   POST /api/v1/lab/parse  → review a report (map + unit-check + reference status); writes nothing
//   POST /api/v1/lab/import → parse JSON/manual/CSV input; writes nothing
//   POST /api/v1/lab/commit → record the report and ingest committable results (source 'lab')
//   GET  /api/v1/lab/results → list committed reports with review + quality status
//   PATCH /api/v1/lab/results/:id → mark/link a report after reviewer review
// Reads use the read-only connection; commit uses the dedicated RW connection.
import { Router } from 'express';
import { db, writeDb } from '../db.js';
import { commitLab, getLabResult, importLab, listLabResults, parseLab, reviewLabResult } from '../lib/lab.js';
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

lab.post('/lab/import', wrap((req, res) => {
  res.json(importLab(db(), req.body || {}, ctx(req.body)));
}));

lab.post('/lab/commit', wrap((req, res) => {
  res.json(commitLab(writeDb(), req.body || {}, ctx(req.body)));
}));

lab.get('/lab/results', wrap((req, res) => {
  res.json({ results: listLabResults(db(), { status: req.query.status, quarantineOnly: req.query.quarantine === 'true' }) });
}));

lab.get('/lab/results/:id', wrap((req, res) => {
  const row = getLabResult(db(), parseInt(req.params.id, 10));
  if (!row) return res.status(404).json({ error: 'lab result not found' });
  res.json({ result: row });
}));

lab.patch('/lab/results/:id', wrap((req, res) => {
  const row = reviewLabResult(writeDb(), parseInt(req.params.id, 10), req.body || {});
  if (!row) return res.status(404).json({ error: 'lab result not found' });
  res.json({ result: row });
}));
