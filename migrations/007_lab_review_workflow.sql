-- 007_lab_review_workflow — visible lab-import + lab-result review workflow.
-- Additive-only: lab_results remains the report table; these columns add
-- reviewer state and ingest-quality traceability for Domains 11/12.

ALTER TABLE lab_results ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE lab_results ADD COLUMN reviewer_id TEXT;
ALTER TABLE lab_results ADD COLUMN reviewed_at TEXT;
ALTER TABLE lab_results ADD COLUMN biomarker_id TEXT REFERENCES biomarker_registry(metric_key);
ALTER TABLE lab_results ADD COLUMN review_note TEXT;
ALTER TABLE lab_results ADD COLUMN ingest_id INTEGER REFERENCES ingest_log(id);
ALTER TABLE lab_results ADD COLUMN parsed_review TEXT;

CREATE INDEX IF NOT EXISTS idx_lab_results_review_status ON lab_results(review_status);
CREATE INDEX IF NOT EXISTS idx_lab_results_ingest ON lab_results(ingest_id);
