// Dedicated lab-result import parser + review/commit (Domains 11/12, task #7).
//
// Generic ingest works analyte-by-analyte but knows nothing about lab reports:
// panel grouping, lab-specific analyte names, reporting units (mg/dL vs mmol/L),
// or reference-range review before commit. This module adds that layer:
//
//   parseLab(db, payload)   → REVIEW: map analytes → biomarker metrics, normalise
//                             units, flag mismatches, attach reference-range
//                             status. Pure read; writes nothing.
//   commitLab(wdb, payload) → record the raw report in lab_results, then ingest
//                             the committable results as observations (source
//                             'lab', idempotent + LWW via the shared ingest path).
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

export function commitLab(wdb, payload, opts = {}) {
  const parsed = parseLab(wdb, payload, opts);
  const { lab_name, collected_at, panel, report_id } = parsed.report;

  // Record the raw report (idempotent on (lab_name, report_id) when report_id set).
  const labRow = wdb.prepare(
    `INSERT INTO lab_results (collected_at, lab_name, panel, report_id, raw_payload)
     VALUES (?,?,?,?,?)
     ON CONFLICT(lab_name, report_id) DO UPDATE SET collected_at = excluded.collected_at,
       panel = excluded.panel, raw_payload = excluded.raw_payload`
  ).run(collected_at, lab_name, panel, report_id, JSON.stringify(payload));
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

  const ingest = ingestRecords(wdb, { sourceName: 'lab', format: 'lab', records, payload: JSON.stringify(payload) });
  return { lab_result_id: labResultId, committed: ingest.records_written, ingest, review: parsed };
}

function catalog(db) {
  const m = new Map();
  for (const r of db.prepare('SELECT key, unit, status FROM metric_types').all()) m.set(r.key, r);
  return m;
}
function norm(s) { return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function normUnit(s) { return String(s ?? '').toLowerCase().replace(/\s+/g, ''); } // keep '/', e.g. mg/dL → mg/dl
function toDate(s) { const d = new Date(s); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
function round2(x) { return Math.round(Number(x) * 100) / 100; }
