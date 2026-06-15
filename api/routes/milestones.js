import { Router } from 'express';
import { db, writeDb } from '../db.js';
import { detectMilestones, listMilestones } from '../lib/milestones.js';

export const milestones = Router();

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) { next(e); }
};

milestones.get('/milestones', wrap((req, res) => {
  res.json({ milestones: listMilestones(db(), req.query) });
}));

milestones.post('/milestones/detect', wrap((_req, res) => {
  const wdb = writeDb();
  const out = detectMilestones(wdb, wdb);
  res.json({ detected: out.detected, written: out.written });
}));
