// Liveness + readiness for the Core API (goal 15). Unauthenticated by design so
// uptime probes work without a token. Reports DB reachability and freshness.
import { Router } from 'express';
import { db } from '../db.js';

export const health = Router();
const STARTED = Date.now();

health.get('/', (_req, res) => {
  const out = {
    service: 'health-core-api',
    version: process.env.npm_package_version || '0.1.0',
    api: 'v1',
    uptime_s: Math.round((Date.now() - STARTED) / 1000),
    db: { ok: false }
  };
  try {
    const d = db();
    const counts = d.prepare('SELECT (SELECT COUNT(*) FROM observations) AS observations, (SELECT COUNT(*) FROM metric_types) AS metric_types, (SELECT COUNT(*) FROM sources) AS sources').get();
    const last = d.prepare('SELECT MAX(updated_at) AS last_write, MAX(timestamp) AS last_observation FROM observations').get();
    out.db = { ok: true, query_only: d.pragma('query_only', { simple: true }) === 1, ...counts, ...last };
    res.json({ status: 'ok', ...out });
  } catch (e) {
    out.db.error = e.message;
    res.status(503).json({ status: 'degraded', ...out });
  }
});
