import { Router } from 'express';
import { db } from '../db.js';
import { BadRequest } from '../lib/query.js';
import { goalProgress } from '../lib/goals.js';

export const userGoalsProgress = Router();

const h = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) {
    if (e instanceof BadRequest) res.status(e.status).json({ error: e.message });
    else next(e);
  }
};

userGoalsProgress.get('/user-goals/progress', h((_req, res) => {
  res.json({ goals: goalProgress(db()) });
}));

userGoalsProgress.get('/user-goals/:id/progress', h((req, res) => {
  const goal = goalProgress(db(), req.params.id);
  if (!goal) return res.status(404).json({ error: 'goal not found' });
  res.json({ goal });
}));
