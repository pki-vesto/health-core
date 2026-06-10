// Source (goal 11) + metric (goal 12) management — write side. ADDITIVE-ONLY:
// new sources/metrics can be created and metrics can be deprecated, but an
// existing metric's key/unit/value_kind can NEVER be repurposed (invariant 3).
import { Router } from 'express';
import { writeDb } from '../db.js';

export const manage = Router();
const wrap = (fn) => (req, res) => { try { fn(req, res); } catch (e) { res.status(e.status || 500).json({ error: e.message }); } };

// Create (or idempotently confirm) a source.
manage.post('/sources', wrap((req, res) => {
  const { name, kind } = req.body || {};
  if (!name || !kind) { res.status(400).json({ error: 'name and kind required' }); return; }
  const w = writeDb();
  const existing = w.prepare('SELECT id, name, kind FROM sources WHERE name = ?').get(name);
  if (existing) {
    if (existing.kind !== kind) { res.status(409).json({ error: `source '${name}' exists with kind '${existing.kind}'` }); return; }
    res.json({ source: existing, created: false }); return;
  }
  const info = w.prepare('INSERT INTO sources (name, kind) VALUES (?, ?)').run(name, kind);
  res.status(201).json({ source: { id: Number(info.lastInsertRowid), name, kind }, created: true });
}));

// Create (or idempotently confirm) a metric_type. Additive-only guard.
manage.post('/metrics', wrap((req, res) => {
  const { key, display_name, unit, value_kind = 'numeric', description = null } = req.body || {};
  if (!key || !display_name || !unit) { res.status(400).json({ error: 'key, display_name, unit required' }); return; }
  const w = writeDb();
  const existing = w.prepare('SELECT key, unit, value_kind FROM metric_types WHERE key = ?').get(key);
  if (existing) {
    if (existing.unit !== unit || existing.value_kind !== value_kind) {
      res.status(409).json({ error: `metric '${key}' already exists as ${existing.value_kind}/${existing.unit} — additive-only: deprecate + new key, never repurpose` });
      return;
    }
    res.json({ metric: existing, created: false }); return;
  }
  w.prepare("INSERT INTO metric_types (key, display_name, unit, value_kind, status, description) VALUES (?,?,?,?,'active',?)")
    .run(key, display_name, unit, value_kind, description);
  res.status(201).json({ metric: { key, display_name, unit, value_kind, status: 'active', description }, created: true });
}));

// Deprecate a metric (the only allowed lifecycle change) or edit its description.
manage.patch('/metrics/:key', wrap((req, res) => {
  const { key } = req.params;
  const w = writeDb();
  const existing = w.prepare('SELECT key, status FROM metric_types WHERE key = ?').get(key);
  if (!existing) { res.status(404).json({ error: `metric '${key}' not found` }); return; }
  const { status, description } = req.body || {};
  if (status != null && status !== 'active' && status !== 'deprecated') { res.status(400).json({ error: "status must be 'active' or 'deprecated'" }); return; }
  if (req.body && ('unit' in req.body || 'value_kind' in req.body || 'key' in req.body)) {
    res.status(409).json({ error: 'unit/value_kind/key are immutable (additive-only)' }); return;
  }
  const sets = [], args = [];
  if (status != null) { sets.push('status = ?'); args.push(status); }
  if (description != null) { sets.push('description = ?'); args.push(description); }
  if (!sets.length) { res.status(400).json({ error: 'nothing to update (allowed: status, description)' }); return; }
  args.push(key);
  w.prepare(`UPDATE metric_types SET ${sets.join(', ')} WHERE key = ?`).run(...args);
  res.json({ metric: w.prepare('SELECT key, display_name, unit, value_kind, status, description FROM metric_types WHERE key = ?').get(key) });
}));
