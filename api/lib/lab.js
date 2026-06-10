// Dedicated lab-result import parser + review/commit (Domains 11/12, task #7).
//
// Generic ingest works analyte-by-analyte but knows nothing about lab reports:
// panel grouping, lab-specific analyte names, reporting units (mg/dL vs mmol/L),
// or reference-range review before commit. This module adds that layer:
//
//   importLab(db,payload)   → REVIEW: accepts JSON/manual rows or CSV text, then
//                             maps analytes → biomarkers and checks quality.
//   parseLab(db, payload)   → REVIEW: map analytes → biomarker metrics, normalise
//                             units, flag mismatches, attach reference-range
//                             status. Pure read; writes nothing.
//   commitLab(wdb, payload) → record the raw report in lab_results, then ingest
//                             the committable results as observations (source
//                             'lab', idempotent + LWW via the shared ingest path).
//   reviewLabResult(...)    → reviewer marks a report approved/rejected/pending
//                             and optionally links it to a primary biomarker.
//
// Payload shape (what the import/UI produces):
//   { lab_name, collected_at:'YYYY-MM-DD', panel?, report_id?,
//     results: [ { analyte, value, unit? }, ... ] }
import { BadRequest, isDate } from './query.js';
import { referenceFor } from './health-os.js';
import { ingestRecords } from './ingest.js';

// Normalised analyte name → Core biomarker metric_type. norm() lowercases and
// strips non-alphanumerics, so "LDL-C", "ldl cholesterol", "LDL" all collapse here.
const ANALYTE_ALIASES = {
  totalcholesterol: 'blood.total_cholesterol', cholesterol: 'blood.total_cholesterol', cholesteroltotal: 'blood.total_cholesterol',
  ldl: 'blood.ldl_cholesterol', ldlcholesterol: 'blood.ldl_cholesterol', ldlc: 'blood.ldl_cholesterol',
  hdl: 'blood.hdl_cholesterol', hdlcholesterol: 'blood.hdl_cholesterol', hdlc: 'blood.hdl_cholesterol',
  triglycerides: 'blood.triglycerides', trig: 'blood.triglycerides', trigs: 'blood.triglycerides', tg: 'blood.triglycerides',
  apob: 'blood.apob', apolipoproteinb: 'blood.apob',
  glucose: 'blood.glucose', fastingglucose: 'blood.glucose', bloodglucose: 'blood.glucose',
  hba1c: 'blood.hba1c', a1c: 'blood.hba1c', glycatedhemoglobin: 'blood.hba1c', hemoglobina1c: 'blood.hba1c',
  crp: 'blood.crp', hscrp: 'blood.crp', creactiveprotein: 'blood.crp', highsensitivitycrp: 'blood.crp',
  testosterone: 'hormone.testosterone', totaltestosterone: 'hormone.testosterone',
  cortisol: 'hormone.cortisol',
  vitamind: 'blood.vitamin_d', vitd: 'blood.vitamin_d', '25ohvitamind': 'blood.vitamin_d', '25hydroxyvitamind': 'blood.vitamin_d', '25ohd': 'blood.vitamin_d',
  ferritin: 'blood.ferritin'
};

// Conventional, textbook unit conversions to the Core catalog unit. Conservative
// on purpose: only the two universally-agreed conversions. Anything else with a
// non-matching unit is flagged for human review, never silently guessed.
const CHOLESTEROL = new Set(['blood.total_cholesterol', 'blood.ldl_cholesterol', 'blood.hdl_cholesterol', 'blood.triglycerides']);
function convert(metric, fromNorm, value) {
  if (CHOLESTEROL.has(metric) && fromNorm === 'mg/dl') return round2(value * 0.02586);
  if (metric === 'blood.glucose' && fromNorm === 'mg/dl') return round2(value * 0.05551);
  return null;
}

export function parseLab(db, payload, opts = {}) {
  const p = payload || {};
  const errors = [];
  if (!p.lab_name) errors.push('lab_name is required');
  const collected = String(p.collected_at ?? '');
  const collectedDate = isDate(collected) ? collected : (collected ? toDate(collected) : null);
  if (!collectedDate) errors.push('collected_at must be a date (YYYY-MM-DD or ISO)');
  if (!Array.isArray(p.results) || p.results.length === 0) errors.push('results must be a non-empty array');
  if (errors.length) throw new BadRequest(errors.join('; '));

  const cat = catalog(db);
  const results = [];
  const unmapped = [];

  for (const r of p.results) {
    const analyte = r?.analyte ?? r?.name;
    const key = norm(analyte);
    const metric = ANALYTE_ALIASES[key] || (cat.has(analyte) ? analyte : null);
    if (!metric) { unmapped.push({ analyte, value: r?.value }); continue; }

    const issues = [];
    let value = Number(r.value);
    if (!Number.isFinite(value)) issues.push(`value not numeric: ${r.value}`);

    const catalogUnit = cat.get(metric)?.unit;
    let unit = r.unit ?? catalogUnit;
    let convertedFrom = null;
    if (Number.isFinite(value) && unit !== catalogUnit) {
      const c = convert(metric, normUnit(unit), value);
      if (c != null) { convertedFrom = `${value} ${unit}`; value = c; unit = catalogUnit; }
      else issues.push(`unit '${unit}' != catalog '${catalogUnit}' and no known conversion`);
    }

    const ref = referenceFor(db, metric, opts);
    let status = 'unknown';
    if (ref && Number.isFinite(value)) {
      const low = ref.optimal_low ?? ref.low, high = ref.optimal_high ?? ref.high;
      status = value < low ? 'low' : value > high ? 'high' : 'normal';
    }

    results.push({
      analyte, metric, value: Number.isFinite(value) ? round2(value) : null, unit,
      converted_from: convertedFrom, status, reference: ref || null,
      committable: issues.length === 0, issues
    });
  }

  const committable = results.filter(x => x.committable);
  return {
    report: { lab_name: p.lab_name, collected_at: collectedDate, panel: p.panel ?? null, report_id: p.report_id ?? null },
    results, unmapped,
    summary: {
      analytes: p.results.length,
      mapped: results.length,
      unmapped: unmapped.length,
      committable: committable.length,
      abnormal: committable.filter(x => x.status === 'low' || x.status === 'high').length
    }
  };
}

export function importLab(db, payload, opts = {}) {
  return parseLab(db, normalizeImportPayload(payload), opts);
}

export function commitLab(wdb, payload, opts = {}) {
  const normalPayload = normalizeImportPayload(payload);
  const parsed = parseLab(wdb, normalPayload, opts);
  const { lab_name, collected_at, panel, report_id } = parsed.report;

  // Record the raw report (idempotent on (lab_name, report_id) when report_id set).
  const labRow = wdb.prepare(
    `INSERT INTO lab_results (collected_at, lab_name, panel, report_id, raw_payload, parsed_review, review_status)
     VALUES (?,?,?,?,?,?, 'pending')
     ON CONFLICT(lab_name, report_id) DO UPDATE SET collected_at = excluded.collected_at,
       panel = excluded.panel, raw_payload = excluded.raw_payload, parsed_review = excluded.parsed_review,
       review_status = CASE WHEN lab_results.review_status = 'rejected' THEN 'pending' ELSE lab_results.review_status END`
  ).run(collected_at, lab_name, panel, report_id, JSON.stringify(normalPayload), JSON.stringify(parsed));
  const labResultId = wdb.prepare('SELECT id FROM lab_results WHERE lab_name = ? AND report_id IS ?').get(lab_name, report_id)?.id
    ?? Number(labRow.lastInsertRowid);

  // Build observation records for the committable analytes and ingest them.
  const idBase = report_id || collected_at;
  const records = parsed.results.filter(x => x.committable).map(x => ({
    metric_type: x.metric, value: x.value, unit: x.unit, timestamp: collected_at,
    external_id: `lab:${idBase}:${x.metric}`,
    source_updated_at: `${collected_at}T00:00:00.000Z`,
    metadata: { source_path: 'lab', lab_name, panel, analyte: x.analyte, lab_result_id: labResultId, converted_from: x.converted_from || undefined }
  }));

  const ingest = ingestRecords(wdb, { sourceName: 'lab', format: 'lab', records, payload: JSON.stringify(normalPayload) });
  wdb.prepare('UPDATE lab_results SET ingest_id = ?, parsed_review = ? WHERE id = ?')
    .run(ingest.ingest_id, JSON.stringify({ ...parsed, quality: qualityForIngest(wdb, ingest.ingest_id) }), labResultId);
  return { lab_result_id: labResultId, committed: ingest.records_written, ingest, review: parsed, quality: qualityForIngest(wdb, ingest.ingest_id) };
}

export function listLabResults(db, { status, quarantineOnly = false } = {}) {
  const where = [];
  const args = {};
  if (status) {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new BadRequest('status must be pending, approved, or rejected');
    where.push('lr.review_status = @status');
    args.status = status;
  }
  if (quarantineOnly) where.push('EXISTS (SELECT 1 FROM quarantine q WHERE q.ingest_id = lr.ingest_id AND q.resolved = 0)');
  const rows = db.prepare(
    `SELECT lr.id, lr.collected_at, lr.lab_name, lr.panel, lr.report_id, lr.created_at,
            lr.review_status, lr.reviewer_id, lr.reviewed_at, lr.biomarker_id,
            lr.review_note, lr.ingest_id,
            il.status AS ingest_status, il.records_in, il.records_written, il.records_quarantined,
            (SELECT group_concat(q.reason, '; ') FROM quarantine q WHERE q.ingest_id = lr.ingest_id AND q.resolved = 0) AS quarantine_reason
       FROM lab_results lr
       LEFT JOIN ingest_log il ON il.id = lr.ingest_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY lr.collected_at DESC, lr.id DESC LIMIT 200`
  ).all(args);
  return rows.map(r => ({ ...r, quality_status: qualityStatus(r) }));
}

export function getLabResult(db, id) {
  const row = db.prepare(
    `SELECT lr.*, il.status AS ingest_status, il.records_in, il.records_written, il.records_quarantined
       FROM lab_results lr LEFT JOIN ingest_log il ON il.id = lr.ingest_id WHERE lr.id = ?`
  ).get(id);
  if (!row) return null;
  const quarantine = row.ingest_id
    ? db.prepare('SELECT id, reason, raw_record, created_at, resolved FROM quarantine WHERE ingest_id = ? ORDER BY id').all(row.ingest_id)
    : [];
  return { ...row, parsed_review: safeJson(row.parsed_review), raw_payload: safeJson(row.raw_payload), quarantine, quality_status: qualityStatus(row) };
}

export function reviewLabResult(db, id, patch = {}) {
  const status = patch.review_status ?? patch.status;
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new BadRequest('review_status must be pending, approved, or rejected');
  const biomarker = patch.biomarker_id ?? patch.biomarkerId ?? null;
  if (biomarker && !db.prepare('SELECT 1 FROM biomarker_registry WHERE metric_key = ?').get(biomarker)) {
    throw new BadRequest(`unknown biomarker '${biomarker}'`);
  }
  if (status === 'approved' && !biomarker) throw new BadRequest('biomarker_id is required when approving');
  const reviewer = String(patch.reviewer_id ?? patch.reviewerId ?? 'local-reviewer').slice(0, 120);
  const note = patch.review_note ?? patch.note ?? null;
  const existing = db.prepare('SELECT id FROM lab_results WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare(
    `UPDATE lab_results
        SET review_status = ?, reviewer_id = ?, reviewed_at = datetime('now'),
            biomarker_id = ?, review_note = ?
      WHERE id = ?`
  ).run(status, reviewer, biomarker, note, id);
  return getLabResult(db, id);
}

function normalizeImportPayload(payload) {
  const p = payload || {};
  if (typeof p.file_content === 'string' || typeof p.content === 'string' || typeof p.csv === 'string') {
    const text = p.file_content ?? p.content ?? p.csv;
    const rows = parseCsv(text);
    return {
      lab_name: p.lab_name || p.lab || 'Imported lab',
      collected_at: p.collected_at || rows[0]?.collected_at || rows[0]?.taken_at,
      panel: p.panel ?? null,
      report_id: p.report_id ?? null,
      results: rows.map(csvRowToResult)
    };
  }
  if (p.file_base64) {
    const text = Buffer.from(String(p.file_base64), 'base64').toString('utf8');
    return normalizeImportPayload({ ...p, file_content: text });
  }
  if (p.test_name || p.analyte || p.name) {
    return {
      lab_name: p.lab_name || 'Manual entry',
      collected_at: p.collected_at || p.taken_at,
      panel: p.panel ?? null,
      report_id: p.report_id ?? null,
      results: [csvRowToResult(p)]
    };
  }
  return p;
}

function csvRowToResult(r) {
  return {
    analyte: r.analyte ?? r.test_name ?? r.name,
    value: r.value,
    unit: r.unit,
    reference_range: r.reference_range
  };
}

function parseCsv(text) {
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new BadRequest('CSV must include a header and at least one row');
  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const required = ['test_name', 'value', 'unit'];
  const missing = required.filter(h => !headers.includes(h) && !(h === 'test_name' && headers.includes('analyte')));
  if (missing.length) throw new BadRequest(`CSV missing required column(s): ${missing.join(', ')}`);
  return lines.slice(1).map((line, i) => {
    const cells = splitCsvLine(line);
    if (cells.length !== headers.length) throw new BadRequest(`CSV row ${i + 2} has ${cells.length} cells, expected ${headers.length}`);
    return Object.fromEntries(headers.map((h, idx) => [h, cells[idx]]));
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i], n = line[i + 1];
    if (c === '"' && quoted && n === '"') { cur += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function qualityForIngest(db, ingestId) {
  const ingest = db.prepare('SELECT id, status, records_in, records_written, records_quarantined FROM ingest_log WHERE id = ?').get(ingestId);
  const quarantine = db.prepare('SELECT reason, raw_record FROM quarantine WHERE ingest_id = ? AND resolved = 0 ORDER BY id').all(ingestId);
  return { ingest, quarantine, status: qualityStatus(ingest || {}) };
}

function qualityStatus(row) {
  if ((row.records_quarantined || 0) > 0 || row.quarantine_reason) return row.records_written > 0 ? 'partial' : 'quarantined';
  return row.ingest_status || row.status || 'not_ingested';
}

function catalog(db) {
  const m = new Map();
  for (const r of db.prepare('SELECT key, unit, status FROM metric_types').all()) m.set(r.key, r);
  return m;
}
function safeJson(s) { try { return s ? JSON.parse(s) : null; } catch { return s; } }
function norm(s) { return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function normUnit(s) { return String(s ?? '').toLowerCase().replace(/\s+/g, ''); } // keep '/', e.g. mg/dL → mg/dl
function toDate(s) { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
function round2(x) { return Math.round(Number(x) * 100) / 100; }
