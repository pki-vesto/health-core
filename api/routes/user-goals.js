// User-defined health goals (issue #34) — the intent layer.
//
// SCOPE: the owner declares what "good" looks like for them — a comparator +
// threshold (or range) against an existing metric_types(key), optionally with a
// window and a deadline. The platform later evaluates progress against
// observations (child #4) and surfaces "due goals" in the briefing (child #5).
//
// EXPLICITLY NOT this surface: the 1-250 development registry behind
// /api/v1/goals and /progress (table `health_goals`). That stays untouched.
// This router lives under /api/v1/user-goals to make the separation visible.
//
// ADDITIVE-ONLY: retire/pause is a status change. There is no DELETE — the
// owner's history of intent is part of the record.
import { Router } from 'express';
import { db, writeDb } from '../db.js';

export const userGoals = Router();

const COMPARATORS = ['lte', 'gte', 'eq', 'range'];
const STATUSES = ['active', 'paused', 'achieved', 'retired'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 200;

class BadRequest extends Error {
  constructor(msg) { super(msg); this.status = 400; this.code = 'bad_request'; }
}
class NotFound extends Error {
  constructor(msg) { super(msg); this.status = 404; this.code = 'not_found'; }
}

const wrap = (fn) => (req, res) => {
  try { fn(req, res); }
  catch (e) {
    if (e && (e.status === 400 || e.status === 404)) {
      res.status(e.status).json({ error: e.message, code: e.code });
    } else {
      res.status(500).json({ error: e?.message || 'internal error' });
    }
  }
};

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// Validate that `metric_key` references an existing row in metric_types. Done
// in JS (not relied on as a FK violation) so the client gets a clean
// `unknown_metric_key` 400 rather than a generic constraint error from SQLite.
function metricExists(database, key) {
  return database.prepare('SELECT 1 AS x FROM metric_types WHERE key = ?').get(key) != null;
}

function trimText(v, field) {
  if (v == null) return null;
  if (typeof v !== 'string') throw new BadRequest(`${field} must be a string`);
  const s = v.trim();
  if (s.length === 0) return null;
  if (s.length > MAX_TEXT) throw new BadRequest(`${field} exceeds ${MAX_TEXT} chars`);
  return s;
}

// Interprets `deadline` as a calendar date in Europe/Amsterdam. We only store
// the YYYY-MM-DD form — owner-facing deadlines are day-precision and the local
// calendar is the one the owner thinks in. The regex pins shape; Date.UTC
// rejects impossible dates (e.g. 2026-13-40 — the parsed Date would normalise,
// so we cross-check that the round-trip equals the input).
function normaliseDeadline(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string' || !DATE_RE.test(v)) {
    throw new BadRequest('deadline must be YYYY-MM-DD');
  }
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) throw new BadRequest('deadline is not a real calendar date');
  return v;
}

// Merge a partial PATCH body over an existing row and validate the resulting
// (comparator, value-fields) shape. Returns the canonical update set: { fields,
// args } where fields are SET clauses for the UPDATE.
function buildUpdate(database, existing, body) {
  const out = { ...existing };
  const changed = {};

  if ('metric_key' in body) {
    const k = body.metric_key;
    if (typeof k !== 'string' || k.length === 0) throw new BadRequest('metric_key must be a non-empty string');
    if (!metricExists(database, k)) {
      const e = new BadRequest(`unknown metric_key '${k}'`);
      e.code = 'unknown_metric_key';
      throw e;
    }
    out.metric_key = k; changed.metric_key = k;
  }

  if ('comparator' in body) {
    if (!COMPARATORS.includes(body.comparator)) {
      throw new BadRequest(`comparator must be one of ${COMPARATORS.join(',')}`);
    }
    out.comparator = body.comparator; changed.comparator = body.comparator;
  }

  for (const f of ['target_value', 'target_low', 'target_high']) {
    if (f in body) {
      const v = body[f];
      if (v != null && !isFiniteNumber(v)) {
        throw new BadRequest(`${f} must be a finite number or null`);
      }
      out[f] = v == null ? null : v; changed[f] = out[f];
    }
  }

  if ('window' in body) {
    out.window = trimText(body.window, 'window'); changed.window = out.window;
  }
  if ('label' in body) {
    out.label = trimText(body.label, 'label'); changed.label = out.label;
  }
  if ('deadline' in body) {
    out.deadline = normaliseDeadline(body.deadline); changed.deadline = out.deadline;
  }
  if ('status' in body) {
    if (!STATUSES.includes(body.status)) {
      throw new BadRequest(`status must be one of ${STATUSES.join(',')}`);
    }
    out.status = body.status; changed.status = body.status;
  }

  validateComparatorShape(out);
  return { merged: out, changed };
}

// Comparator/value-field contract:
//   lte | gte | eq → require numeric target_value, and target_low/target_high
//                    must be absent (so the row says what it means).
//   range          → require numeric target_low and target_high with
//                    target_low <= target_high, and target_value must be absent.
function validateComparatorShape(row) {
  const { comparator, target_value, target_low, target_high } = row;
  if (comparator === 'range') {
    if (!isFiniteNumber(target_low) || !isFiniteNumber(target_high)) {
      throw new BadRequest("comparator 'range' requires numeric target_low and target_high");
    }
    if (target_low > target_high) {
      throw new BadRequest('target_low must be <= target_high');
    }
    if (target_value != null) {
      throw new BadRequest("comparator 'range' must not set target_value");
    }
  } else {
    if (!isFiniteNumber(target_value)) {
      throw new BadRequest(`comparator '${comparator}' requires numeric target_value`);
    }
    if (target_low != null || target_high != null) {
      throw new BadRequest(`comparator '${comparator}' must not set target_low/target_high`);
    }
  }
}

const SELECT_COLS = `id, metric_key, comparator, target_value, target_low, target_high,
       window, deadline, status, label, created_at, updated_at`;

function getById(database, id) {
  return database.prepare(`SELECT ${SELECT_COLS} FROM user_health_goals WHERE id = ?`).get(id);
}

function parseId(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new BadRequest('id must be a positive integer');
  return n;
}

// POST /user-goals — create a goal. Returns 201 + the inserted row.
userGoals.post('/user-goals', wrap((req, res) => {
  const body = req.body || {};
  if (!('metric_key' in body)) throw new BadRequest('metric_key is required');
  if (!('comparator' in body)) throw new BadRequest('comparator is required');

  const w = writeDb();
  // Skeleton row gets merged with body for shape validation. Default status to
  // 'active' on create (mirrors the schema default but makes the value explicit
  // in the validated row).
  const skeleton = {
    metric_key: null, comparator: null,
    target_value: null, target_low: null, target_high: null,
    window: null, deadline: null,
    status: 'active', label: null
  };
  const { merged } = buildUpdate(w, skeleton, body);

  const info = w.prepare(
    `INSERT INTO user_health_goals
       (metric_key, comparator, target_value, target_low, target_high,
        window, deadline, status, label)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    merged.metric_key, merged.comparator,
    merged.target_value, merged.target_low, merged.target_high,
    merged.window, merged.deadline, merged.status, merged.label
  );
  res.status(201).json({ goal: getById(w, Number(info.lastInsertRowid)) });
}));

// GET /user-goals — list, optional ?status= filter. DESC by created_at so the
// owner sees their most recent intent first.
userGoals.get('/user-goals', wrap((req, res) => {
  const status = req.query.status;
  const args = [];
  let where = '';
  if (status != null) {
    if (!STATUSES.includes(status)) {
      throw new BadRequest(`status must be one of ${STATUSES.join(',')}`);
    }
    where = 'WHERE status = ?'; args.push(status);
  }
  const rows = db().prepare(
    `SELECT ${SELECT_COLS} FROM user_health_goals ${where}
     ORDER BY datetime(created_at) DESC, id DESC`
  ).all(...args);
  res.json({ goals: rows });
}));

// GET /user-goals/:id — single goal, 404 if missing.
userGoals.get('/user-goals/:id', wrap((req, res) => {
  const id = parseId(req.params.id);
  const row = getById(db(), id);
  if (!row) throw new NotFound(`user_goal ${id} not found`);
  res.json({ goal: row });
}));

// PATCH /user-goals/:id — partial edit. Validates the merged shape so a
// comparator change re-validates value fields against the new comparator. Sets
// updated_at to now. There is no DELETE; status='retired' is the way out.
userGoals.patch('/user-goals/:id', wrap((req, res) => {
  const id = parseId(req.params.id);
  const w = writeDb();
  const existing = getById(w, id);
  if (!existing) throw new NotFound(`user_goal ${id} not found`);

  const body = req.body || {};
  if (Object.keys(body).length === 0) {
    throw new BadRequest('nothing to update');
  }
  const { merged, changed } = buildUpdate(w, existing, body);
  if (Object.keys(changed).length === 0) {
    throw new BadRequest('no editable fields supplied');
  }

  // Always set updated_at on a PATCH (even if every other field is unchanged
  // value-wise) so the audit timeline reflects the touch.
  w.prepare(
    `UPDATE user_health_goals
        SET metric_key = ?, comparator = ?,
            target_value = ?, target_low = ?, target_high = ?,
            window = ?, deadline = ?, status = ?, label = ?,
            updated_at = datetime('now')
      WHERE id = ?`
  ).run(
    merged.metric_key, merged.comparator,
    merged.target_value, merged.target_low, merged.target_high,
    merged.window, merged.deadline, merged.status, merged.label,
    id
  );
  res.json({ goal: getById(w, id) });
}));
