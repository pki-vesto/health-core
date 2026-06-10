-- 004_biomarkers_bloodwork_stress_health_os — concrete backlog after goal 100.
-- Covers supplied goals 101-130 and 241-250. Goals 131-240 were not supplied
-- in the backlog text and are intentionally not invented here.

CREATE TABLE IF NOT EXISTS biomarker_registry (
  metric_key  TEXT PRIMARY KEY REFERENCES metric_types(key),
  category    TEXT NOT NULL,
  specimen    TEXT NOT NULL DEFAULT 'blood',
  loinc       TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS biomarker_reference_ranges (
  id          INTEGER PRIMARY KEY,
  metric_key  TEXT NOT NULL REFERENCES metric_types(key),
  sex         TEXT NOT NULL DEFAULT 'any',
  age_min     INTEGER NOT NULL DEFAULT 0,
  age_max     INTEGER NOT NULL DEFAULT 120,
  low         REAL NOT NULL,
  high        REAL NOT NULL,
  optimal_low REAL,
  optimal_high REAL,
  unit        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'default',
  UNIQUE(metric_key, sex, age_min, age_max, source)
);

CREATE TABLE IF NOT EXISTS lab_results (
  id             INTEGER PRIMARY KEY,
  collected_at   TEXT NOT NULL,
  lab_name       TEXT,
  panel          TEXT,
  report_id      TEXT,
  raw_payload    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(lab_name, report_id)
);

INSERT OR IGNORE INTO sources (name, kind) VALUES ('health_core', 'module');

INSERT OR IGNORE INTO metric_types (key, display_name, unit, value_kind, status, description) VALUES
  ('blood.total_cholesterol', 'Total cholesterol', 'mmol/L', 'numeric', 'active', 'Blood lipid marker.'),
  ('blood.ldl_cholesterol', 'LDL cholesterol', 'mmol/L', 'numeric', 'active', 'Blood lipid marker.'),
  ('blood.hdl_cholesterol', 'HDL cholesterol', 'mmol/L', 'numeric', 'active', 'Blood lipid marker.'),
  ('blood.triglycerides', 'Triglycerides', 'mmol/L', 'numeric', 'active', 'Blood lipid marker.'),
  ('blood.apob', 'ApoB', 'g/L', 'numeric', 'active', 'Apolipoprotein B.'),
  ('blood.glucose', 'Glucose', 'mmol/L', 'numeric', 'active', 'Fasting or random blood glucose.'),
  ('blood.hba1c', 'HbA1c', '%', 'numeric', 'active', 'Glycated hemoglobin.'),
  ('blood.crp', 'C-reactive protein', 'mg/L', 'numeric', 'active', 'Inflammation marker.'),
  ('hormone.testosterone', 'Testosterone', 'nmol/L', 'numeric', 'active', 'Hormone marker.'),
  ('hormone.cortisol', 'Cortisol', 'nmol/L', 'numeric', 'active', 'Hormone and stress marker.'),
  ('blood.vitamin_d', 'Vitamin D', 'nmol/L', 'numeric', 'active', 'Vitamin marker.'),
  ('blood.ferritin', 'Ferritin', 'ug/L', 'numeric', 'active', 'Iron storage marker.'),
  ('stress.perceived', 'Perceived stress', 'score', 'numeric', 'active', 'Self-reported stress score 0-100.'),
  ('score.stress', 'Stress score', 'score', 'numeric', 'active', 'Derived stress intelligence score.'),
  ('score.cardiometabolic', 'Cardiometabolic score', 'score', 'numeric', 'active', 'Derived score from lipids, glucose and inflammation markers.');

INSERT OR IGNORE INTO biomarker_registry (metric_key, category, specimen, description) VALUES
  ('blood.total_cholesterol', 'cholesterol', 'blood', 'Total cholesterol.'),
  ('blood.ldl_cholesterol', 'cholesterol', 'blood', 'LDL cholesterol.'),
  ('blood.hdl_cholesterol', 'cholesterol', 'blood', 'HDL cholesterol.'),
  ('blood.triglycerides', 'cholesterol', 'blood', 'Triglycerides.'),
  ('blood.apob', 'apob', 'blood', 'Apolipoprotein B.'),
  ('blood.glucose', 'glucose', 'blood', 'Blood glucose.'),
  ('blood.hba1c', 'glucose', 'blood', 'HbA1c.'),
  ('blood.crp', 'inflammation', 'blood', 'C-reactive protein.'),
  ('hormone.testosterone', 'hormone', 'blood', 'Testosterone.'),
  ('hormone.cortisol', 'hormone', 'blood', 'Cortisol.'),
  ('blood.vitamin_d', 'vitamin', 'blood', 'Vitamin D.'),
  ('blood.ferritin', 'mineral', 'blood', 'Ferritin / iron storage.');

INSERT OR IGNORE INTO biomarker_reference_ranges
  (metric_key, sex, age_min, age_max, low, high, optimal_low, optimal_high, unit, source) VALUES
  ('blood.total_cholesterol', 'any', 18, 120, 0, 5.2, 0, 4.5, 'mmol/L', 'default'),
  ('blood.ldl_cholesterol', 'any', 18, 120, 0, 3.4, 0, 2.6, 'mmol/L', 'default'),
  ('blood.hdl_cholesterol', 'male', 18, 120, 1.0, 99, 1.2, 99, 'mmol/L', 'default'),
  ('blood.hdl_cholesterol', 'female', 18, 120, 1.2, 99, 1.4, 99, 'mmol/L', 'default'),
  ('blood.triglycerides', 'any', 18, 120, 0, 1.7, 0, 1.2, 'mmol/L', 'default'),
  ('blood.apob', 'any', 18, 120, 0, 1.0, 0, 0.8, 'g/L', 'default'),
  ('blood.glucose', 'any', 18, 120, 3.9, 5.6, 4.0, 5.2, 'mmol/L', 'default'),
  ('blood.hba1c', 'any', 18, 120, 4.0, 5.6, 4.5, 5.3, '%', 'default'),
  ('blood.crp', 'any', 18, 120, 0, 3.0, 0, 1.0, 'mg/L', 'default'),
  ('hormone.testosterone', 'male', 18, 120, 8.0, 30.0, 12.0, 25.0, 'nmol/L', 'default'),
  ('hormone.testosterone', 'female', 18, 120, 0.5, 2.4, 0.5, 2.0, 'nmol/L', 'default'),
  ('hormone.cortisol', 'any', 18, 120, 140, 690, 200, 550, 'nmol/L', 'default'),
  ('blood.vitamin_d', 'any', 18, 120, 50, 250, 75, 150, 'nmol/L', 'default'),
  ('blood.ferritin', 'male', 18, 120, 30, 400, 50, 200, 'ug/L', 'default'),
  ('blood.ferritin', 'female', 18, 120, 15, 150, 40, 120, 'ug/L', 'default');

INSERT INTO health_goals (id, domain, title, status, evidence) VALUES
  (101, 11, 'Support laboratory results', 'complete', 'lab_results table + lab source + biomarker metric types'),
  (102, 11, 'Build biomarker registry', 'complete', 'biomarker_registry + GET /biomarkers/registry'),
  (103, 11, 'Support reference values', 'complete', 'biomarker_reference_ranges'),
  (104, 11, 'Support age-dependent references', 'complete', 'age_min/age_max'),
  (105, 11, 'Support sex-dependent references', 'complete', 'sex column + selection logic'),
  (106, 11, 'Visualize biomarker trends', 'complete', 'GET /biomarkers/trends'),
  (107, 11, 'Detect abnormal biomarkers', 'complete', 'GET /biomarkers/abnormal'),
  (108, 11, 'Build biomarker dashboards', 'complete', 'GET /biomarkers/dashboard'),
  (109, 11, 'Build biomarker correlations', 'complete', 'GET /biomarkers/correlations'),
  (110, 11, 'Build biomarker scorecards', 'complete', 'GET /biomarkers/scorecard'),
  (111, 12, 'Support cholesterol analysis', 'complete', 'GET /bloodwork/overview cholesterol panel'),
  (112, 12, 'Support ApoB tracking', 'complete', 'blood.apob'),
  (113, 12, 'Support glucose tracking', 'complete', 'blood.glucose'),
  (114, 12, 'Support HbA1c tracking', 'complete', 'blood.hba1c'),
  (115, 12, 'Support inflammation markers', 'complete', 'blood.crp'),
  (116, 12, 'Support hormone tracking', 'complete', 'hormone.*'),
  (117, 12, 'Support vitamin tracking', 'complete', 'blood.vitamin_d'),
  (118, 12, 'Support mineral tracking', 'complete', 'blood.ferritin'),
  (119, 12, 'Build cardiometabolic score', 'complete', 'GET /bloodwork/cardiometabolic'),
  (120, 12, 'Build bloodwork overview', 'complete', 'GET /bloodwork/overview'),
  (121, 13, 'Build stress data model', 'complete', 'stress.perceived + score.stress'),
  (122, 13, 'Integrate stress measurements', 'complete', 'generic ingest supports stress.perceived'),
  (123, 13, 'Analyze stress trends', 'complete', 'GET /stress/summary'),
  (124, 13, 'Correlate stress and HRV', 'complete', 'GET /stress/summary correlations'),
  (125, 13, 'Correlate stress and sleep', 'complete', 'GET /stress/summary correlations'),
  (126, 13, 'Correlate stress and performance', 'complete', 'GET /stress/summary correlations'),
  (127, 13, 'Detect chronic stress', 'complete', 'GET /stress/alerts'),
  (128, 13, 'Build stress score', 'complete', 'GET /stress/summary score'),
  (129, 13, 'Build stress dashboard', 'complete', 'GET /stress/dashboard'),
  (130, 13, 'Build stress warnings', 'complete', 'GET /stress/alerts'),
  (241, 25, 'Build daily briefing', 'complete', 'GET /briefing/daily'),
  (242, 25, 'Build weekly briefing', 'complete', 'GET /briefing/weekly'),
  (243, 25, 'Build monthly briefing', 'complete', 'GET /briefing/monthly'),
  (244, 25, 'Build quarterly reports', 'complete', 'GET /briefing/quarterly'),
  (245, 25, 'Build yearly overviews', 'complete', 'GET /briefing/yearly'),
  (246, 25, 'Build personal health profiles', 'complete', 'GET /health-profile'),
  (247, 25, 'Build health goals', 'complete', 'GET /health-goals'),
  (248, 25, 'Build progress monitoring', 'complete', 'GET /progress'),
  (249, 25, 'Build decision support', 'complete', 'GET /decision-support'),
  (250, 25, 'Function as personal Health Operating System', 'complete', 'GET /operating-system')
ON CONFLICT(id) DO UPDATE SET
  domain = excluded.domain,
  title = excluded.title,
  status = excluded.status,
  evidence = excluded.evidence,
  updated_at = datetime('now');
