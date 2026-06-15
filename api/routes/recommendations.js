// Recommendation lifecycle routes (issue #33).
//
//   POST /api/v1/recommendations/:rec_key/action
//        body: { status, snooze_until?, note? }
//   GET  /api/v1/recommendations/actions[?rec_key=&limit=]
//
// Write side uses writeDb() (the dedicated R/W connection); read side uses db()
// (the query_only connection). Validation is intentionally strict: invalid
// status, missing/past `snooze_until` on a snooze, or `snooze_until` provided
// alongside a non-snooze status all return 400 — the read-path filter relies on
// these rows being well-formed.
//
// The decisionSupport read path joins against the LATEST row per rec_key
// (api/lib/health-os.js latestRecommendationActions) and hides
// dismissed/done/active-snoozed items at the same Europe/Amsterdam day boundary
// the briefing layer uses, so a future snooze_until written here is honoured by
// the same civil clock that wrote it.
import { Router } from 'express';
import { db, writeDb } from '../db.js';
import { BadRequest } from '../lib/query.js';

export const recommendations = Router();

const STATUSES = new Set(['acknowledged', 'snoozed', 'dismissed', 'done']);
const NOTE_MAX = 500;
const REC_KEY_MAX = 200;

const wrap = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) { if (e instanceof BadRequest) res.status(400).json({ error: e.message }); else next(e); }
};

// `rec_key` is owner-supplied text — the action may pre-date or post-date the
// recommendation that produced it. We constrain shape (length, character set)
// but do not require the rec_key to currently match an emitted recommendation:
// actions are allowed to precede or outlive any single recompute.
function parseRecKey(raw) {
  if (raw == null) throw new BadRequest('rec_key is required');
  const s = String(raw).trim();
  if (!s) throw new BadRequest('rec_key is required');
  if (s.length > REC_KEY_MAX) throw new BadRequest(`rec_key exceeds ${REC_KEY_MAX} chars`);
  // Allow lowercase letters/digits, dot/colon/underscore/hyphen/slash so the
  // deterministic recKey() output (`type:metric.subkey`) is accepted as-is.
  if (!/^[a-z0-9][a-z0-9._:/-]*$/i.test(s)) throw new BadRequest('rec_key contains invalid characters');
  return s;
}

// ISO8601 string in Europe/Amsterdam (matches briefing_snapshots convention,
// e.g. '2026-06-15T10:00:00+02:00'). We accept a `Z` suffix too, since clients
// may send UTC; lexicographic compare against amsterdamNowIso() is only valid
// when both sides carry an explicit offset, so we require one of these shapes.
function parseSnoozeUntil(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)) {
    throw new BadRequest('snooze_until must be ISO8601 with timezone offset (e.g. 2026-06-20T08:00:00+02:00)');
  }
  if (Number.isNaN(Date.parse(s))) throw new BadRequest('snooze_until is not a valid date');
  return s;
}

recommendations.post('/recommendations/:rec_key/action', wrap((req, res) => {
  const rec_key = parseRecKey(req.params.rec_key);
  const body = req.body || {};
  const status = String(body.status || '').trim();
  if (!STATUSES.has(status)) {
    throw new BadRequest(`status must be one of ${[...STATUSES].join(', ')}`);
  }
  const snooze_until = parseSnoozeUntil(body.snooze_until);
  if (status === 'snoozed') {
    if (!snooze_until) throw new BadRequest('snooze_until is required when status=snoozed');
    if (Date.parse(snooze_until) <= Date.now()) throw new BadRequest('snooze_until must be in the future');
  } else if (snooze_until) {
    throw new BadRequest(`snooze_until is only valid with status=snoozed (got status=${status})`);
  }
  let note = null;
  if (body.note != null) {
    note = String(body.note);
    if (note.length > NOTE_MAX) throw new BadRequest(`note exceeds ${NOTE_MAX} chars`);
  }
  const info = writeDb().prepare(
    `INSERT INTO recommendation_actions (rec_key, status, snooze_until, note)
     VALUES (?, ?, ?, ?)`
  ).run(rec_key, status, snooze_until, note);
  res.status(201).json({
    ok: true,
    id: Number(info.lastInsertRowid),
    rec_key,
    status,
    snooze_until,
    note
  });
}));

recommendations.get('/recommendations/actions', wrap((req, res) => {
  const args = [];
  let where = '';
  if (req.query.rec_key != null && req.query.rec_key !== '') {
    where = 'WHERE rec_key = ?';
    args.push(parseRecKey(req.query.rec_key));
  }
  let limit = parseInt(req.query.limit ?? '100', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 100;
  if (limit > 500) limit = 500;
  args.push(limit);
  const rows = db().prepare(
    `SELECT id, rec_key, status, snooze_until, note, created_at
       FROM recommendation_actions ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`
  ).all(...args);
  res.json({ actions: rows });
}));
