// Core DB connection for the read API.
//
// MILESTONE 1 INVARIANT — READ ONLY. We open core.db read/write-capable (so a
// WAL reader cooperates cleanly with shred-api, the live writer, even when its
// -shm/-wal are present) but immediately set `PRAGMA query_only = ON`. SQLite
// then rejects every INSERT/UPDATE/DELETE/DDL on this connection at the engine
// level. There is intentionally no write code path in this service yet; the
// pragma is a hard belt-and-braces guarantee, not the only safeguard.
//
// Ingest (writes) arrives in a later milestone as an explicit, audited module
// with its own connection — never by relaxing this one.
import Database from 'better-sqlite3';

function corePath() { return process.env.CORE_DB || '/core/core.db'; }

let _db = null;

export function db() {
  if (_db) return _db;
  const d = new Database(corePath(), { fileMustExist: true });
  d.pragma('journal_mode = WAL');     // match the writer; harmless if already WAL
  d.pragma('synchronous = NORMAL');
  d.pragma('foreign_keys = ON');
  d.pragma('busy_timeout = 5000');    // wait out the writer's brief locks
  d.pragma('query_only = ON');        // ← hard read-only for this connection
  _db = d;
  return _db;
}

// Separate READ/WRITE connection, used ONLY by the ingest layer (never by read
// routes). Kept distinct from db() so the read path keeps its query_only
// guarantee and a write bug can never ride in through a read handler. WAL +
// busy_timeout let it coexist with shred-api (the other writer): SQLite
// serialises writers and we wait out brief locks instead of erroring.
let _wdb = null;
export function writeDb() {
  if (_wdb) return _wdb;
  const d = new Database(corePath(), { fileMustExist: true });
  d.pragma('journal_mode = WAL');
  d.pragma('synchronous = NORMAL');
  d.pragma('foreign_keys = ON');
  d.pragma('busy_timeout = 10000');
  _wdb = d;
  return _wdb;
}

export const dbPath = corePath();

// Test hook: drop cached connections so a follow-up db()/writeDb() reopens
// against the current CORE_DB. Only used by suites that swap the underlying
// file between tests (e.g. recommendation-actions after briefing-routes).
export function __resetForTests() {
  try { _db?.close(); } catch {}
  try { _wdb?.close(); } catch {}
  _db = null;
  _wdb = null;
}
