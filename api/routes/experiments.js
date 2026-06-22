import { Router } from 'express';
import { db, writeDb } from '../db.js';
import { BadRequest } from '../lib/query.js';
import {
  analyze,
  createExperiment,
  getExperiment,
  listExperiments,
  parseId,
  setStatus
} from '../lib/experiments.js';

export const experiments = Router();

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) {
    if (e instanceof BadRequest || e.status === 404) {
      res.status(e.status || 400).json({ error: e.message });
    } else {
      next(e);
    }
  }
};

experiments.get('/experiments', wrap((_req, res) => {
  res.json({ experiments: listExperiments(db()) });
}));

experiments.post('/experiments', wrap((req, res) => {
  const experiment = createExperiment(writeDb(), req.body || {});
  res.status(201).json({ experiment });
}));

experiments.get('/experiments/:id/analysis', wrap((req, res) => {
  const out = analyze(db(), writeDb(), req.params.id);
  res.json(out);
}));

experiments.get('/experiments/:id', wrap((req, res) => {
  res.json({ experiment: getExperiment(db(), parseId(req.params.id)) });
}));

experiments.patch('/experiments/:id', wrap((req, res) => {
  const body = req.body || {};
  if (!('status' in body)) throw new BadRequest('status is required');
  const updated = setStatus(writeDb(), req.params.id, body.status);
  if (updated.status !== 'concluded') {
    res.json({ experiment: updated });
    return;
  }
  const out = analyze(db(), writeDb(), updated.id);
  res.json(out);
}));
