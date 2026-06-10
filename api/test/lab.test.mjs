// Unit tests for the dedicated lab-result parser/commit (api/lib/lab.js).
// Covers analyte mapping, unit conversion, reference-range status, unmapped +
// non-committable handling, and idempotent commit into observations.
import { fileURLToPath } from 'node:url';
import { buildDb, closeDb, harness } from './fixtures.mjs';
import { commitLab, importLab, listLabResults, parseLab, reviewLabResult } from '../lib/lab.js';

const PAYLOAD = {
  lab_name: 'Synthetic Lab', collected_at: '2026-05-01', panel: 'lipids+metabolic', report_id: 'R1',
  results: [
    { analyte: 'LDL-C', value: 3.1, unit: 'mmol/L' },     // high (>2.6 optimal)
    { analyte: 'ApoB', value: 0.7, unit: 'g/L' },          // normal (≤0.8)
    { analyte: 'Glucose', value: 90, unit: 'mg/dL' },      // convert → 5.0 mmol/L, normal
    { analyte: 'HDL', value: 200, unit: 'mg/dL' },         // convert → 5.17 mmol/L, no 'any' range → unknown
    { analyte: 'Vitamin D', value: 60, unit: 'nmol/L' },   // low (<75 optimal)
    { analyte: 'Mystery Marker', value: 1, unit: 'x' },    // unmapped
    { analyte: 'HbA1c', value: 5.0, unit: 'mmol/mol' }     // unit mismatch, no conversion → not committable
  ]
};

export function run() {
  const t = harness('lab.js parser/commit (fixtures)');

  // ── parseLab review ────────────────────────────────────────────────────────
  {
    const db = buildDb();
    const p = parseLab(db, PAYLOAD);
    const by = Object.fromEntries(p.results.map(r => [r.metric, r]));
    t.eq('summary', p.summary, { analytes: 7, mapped: 6, unmapped: 1, committable: 5, abnormal: 2 });
    t.eq('LDL high', { status: by['blood.ldl_cholesterol'].status, committable: by['blood.ldl_cholesterol'].committable }, { status: 'high', committable: true });
    t.eq('ApoB normal', by['blood.apob'].status, 'normal');
    t.eq('glucose converted mg/dL→mmol/L', { value: by['blood.glucose'].value, from: by['blood.glucose'].converted_from, status: by['blood.glucose'].status }, { value: 5, from: '90 mg/dL', status: 'normal' });
    t.eq('HDL converted, status unknown for sex=any', { value: by['blood.hdl_cholesterol'].value, status: by['blood.hdl_cholesterol'].status }, { value: 5.17, status: 'unknown' });
    t.eq('Vitamin D low', by['blood.vitamin_d'].status, 'low');
    t.eq('HbA1c unit mismatch not committable', { committable: by['blood.hba1c'].committable, issues: by['blood.hba1c'].issues.length }, { committable: false, issues: 1 });
    t.eq('unmapped surfaced', p.unmapped.map(u => u.analyte), ['Mystery Marker']);
    t.eq('report normalised', p.report, { lab_name: 'Synthetic Lab', collected_at: '2026-05-01', panel: 'lipids+metabolic', report_id: 'R1' });
    closeDb(db);
  }

  // ── reference selection honours sex (HDL gets a male range) ─────────────────
  {
    const db = buildDb();
    const p = parseLab(db, PAYLOAD, { sex: 'male' });
    const hdl = p.results.find(r => r.metric === 'blood.hdl_cholesterol');
    t.eq('HDL normal for male', hdl.status, 'normal'); // 5.17 ≥ 1.2 optimal_low
    closeDb(db);
  }

  // ── commitLab: records report + ingests committable, idempotent ─────────────
  {
    const db = buildDb();
    const c1 = commitLab(db, PAYLOAD);
    t.eq('committed 5 observations', c1.committed, 5);
    t.eq('one lab_results row', db.prepare('SELECT COUNT(*) n FROM lab_results').get().n, 1);
    const glucose = db.prepare("SELECT o.value, s.name src FROM observations o JOIN sources s ON s.id=o.source WHERE o.external_id='lab:R1:blood.glucose'").get();
    t.eq('glucose stored from lab source', { value: glucose.value, src: glucose.src }, { value: 5, src: 'lab' });
    t.eq('HbA1c (non-committable) not stored', db.prepare("SELECT COUNT(*) n FROM observations WHERE metric_type='blood.hba1c'").get().n, 0);

    const c2 = commitLab(db, PAYLOAD);
    t.eq('re-commit idempotent (0 written)', c2.ingest.records_written, 0);
    t.eq('still one lab_results row', db.prepare('SELECT COUNT(*) n FROM lab_results').get().n, 1);
    closeDb(db);
  }

  // ── import workflow: CSV/manual input, review status, quality visibility ────
  {
    const db = buildDb();
    const csv = 'test_name,value,unit,taken_at,reference_range\nLDL-C,3.1,mmol/L,2026-05-03,\nGlucose,95,mg/dL,2026-05-03,';
    const p = importLab(db, { lab_name: 'CSV Lab', collected_at: '2026-05-03', panel: 'bloodwork', report_id: 'CSV1', file_content: csv });
    t.eq('CSV import maps two biomarkers', { mapped: p.summary.mapped, committable: p.summary.committable }, { mapped: 2, committable: 2 });
    const c = commitLab(db, { lab_name: 'CSV Lab', collected_at: '2026-05-03', panel: 'bloodwork', report_id: 'CSV1', file_content: csv });
    const listed = listLabResults(db, { status: 'pending' });
    t.eq('pending review row exposes accepted quality', { n: listed.length, status: listed[0].review_status, quality: listed[0].quality_status }, { n: 1, status: 'pending', quality: 'accepted' });
    const reviewed = reviewLabResult(db, c.lab_result_id, { review_status: 'approved', reviewer_id: 'tester', biomarker_id: 'blood.ldl_cholesterol' });
    t.eq('approve stores reviewer + biomarker link', { status: reviewed.review_status, reviewer: reviewed.reviewer_id, biomarker: reviewed.biomarker_id }, { status: 'approved', reviewer: 'tester', biomarker: 'blood.ldl_cholesterol' });
    closeDb(db);
  }

  // ── quarantine/quality state from ingest is visible in review queue ─────────
  {
    const db = buildDb();
    const bad = { lab_name: 'Quality Lab', collected_at: '2999-01-01', panel: 'future', report_id: 'Q1', results: [{ analyte: 'LDL-C', value: 3.1, unit: 'mmol/L' }] };
    const c = commitLab(db, bad);
    t.eq('future lab value quarantined by ingest', { written: c.ingest.records_written, quarantined: c.ingest.records_quarantined, quality: c.quality.status }, { written: 0, quarantined: 1, quality: 'quarantined' });
    const q = listLabResults(db, { quarantineOnly: true })[0];
    t.ok('quarantine reason surfaced', q && q.quality_status === 'quarantined' && /future timestamp/.test(q.quarantine_reason || ''), JSON.stringify(q));
    closeDb(db);
  }

  // ── parseLab rejects malformed reports ─────────────────────────────────────
  {
    const db = buildDb();
    t.throws('missing lab_name/results → 400', () => parseLab(db, { collected_at: '2026-05-01' }), 400);
    t.throws('bad collected_at → 400', () => parseLab(db, { lab_name: 'X', collected_at: 'nope', results: [{ analyte: 'LDL', value: 1 }] }), 400);
    t.throws('approve without biomarker → 400', () => {
      const c = commitLab(db, { lab_name: 'X', collected_at: '2026-05-01', report_id: 'X1', results: [{ analyte: 'LDL', value: 1, unit: 'mmol/L' }] });
      reviewLabResult(db, c.lab_result_id, { review_status: 'approved' });
    }, 400);
    closeDb(db);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
