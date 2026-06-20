// Versioned read API (v1) over the Core. Briefing generators (/briefing/:period)
// persist a snapshot via the dedicated write connection (issue #32); everything
// else is pure read.
import { Router } from 'express';
import { db, writeDb } from '../db.js';
import * as q from '../lib/query.js';
import { runIntegrity } from '../lib/integrity.js';
import * as intel from '../lib/intelligence.js';
import * as hos from '../lib/health-os.js';
import * as platform from '../lib/platform.js';

export const v1 = Router();

// Wrap a handler so q.BadRequest → 400 and anything else → 500 (via app handler).
const h = (fn) => (req, res, next) => {
  try { fn(req, res); }
  catch (e) {
    if (e instanceof q.BadRequest || e instanceof q.PayloadTooLarge) res.status(e.status).json({ error: e.message });
    else next(e);
  }
};

// Catalog
v1.get('/metrics', h((req, res) => {
  res.json({ metrics: q.listMetrics(db(), { includeDeprecated: req.query.all === '1' }) });
}));
v1.get('/sources', h((_req, res) => {
  res.json({ sources: q.listSources(db()) });
}));

// Observations
v1.get('/observations', h((req, res) => {
  res.json(q.queryObservations(db(), req.query));
}));
v1.get('/observations/latest', h((req, res) => {
  res.json({ latest: q.latestPerMetric(db(), req.query) });
}));
v1.get('/export/observations', h((req, res) => {
  res.type('application/x-ndjson');
  for (const row of q.exportObservations(db(), req.query)) {
    res.write(JSON.stringify(q.exportRow(row)) + '\n');
  }
  res.end();
}));
v1.get('/export/observations.json', h((req, res) => {
  res.json(q.exportObservationsJson(db(), req.query));
}));

// Time series for charts
v1.get('/series/:metric', h((req, res) => {
  res.json(q.series(db(), req.params.metric, req.query));
}));

// Summary stats
v1.get('/stats', h((_req, res) => {
  res.json({ stats: q.stats(db()) });
}));

// Integrity report (goal 14)
v1.get('/integrity', h((_req, res) => {
  const report = runIntegrity(db());
  res.status(report.ok ? 200 : 409).json(report);
}));

// Domains 3-10: read-only intelligence layer over the observations kernel.
v1.get('/dashboard', h((req, res) => {
  res.json(intel.dashboard(db(), req.query));
}));
v1.get('/training/summary', h((req, res) => {
  res.json(intel.trainingSummary(db(), req.query));
}));
v1.get('/nutrition/summary', h((req, res) => {
  res.json(intel.nutritionSummary(db(), req.query));
}));
v1.get('/recovery/summary', h((req, res) => {
  res.json(intel.recoverySummary(db(), req.query));
}));
v1.get('/correlations', h((req, res) => {
  res.json(intel.correlations(db(), req.query));
}));
v1.get('/experiments/readiness', h((_req, res) => {
  res.json(intel.experimentReadiness(db()));
}));
v1.get('/predictions', h((req, res) => {
  res.json(intel.predictions(db(), req.query));
}));
v1.get('/product/status', h((_req, res) => {
  res.json(intel.platformStatus(db()));
}));

// Concrete backlog after goal 100: Domains 11, 12, 13 and 25.
v1.get('/biomarkers/registry', h((_req, res) => {
  res.json(hos.biomarkerRegistry(db()));
}));
v1.get('/biomarkers/ranges', h((req, res) => {
  res.json(hos.referenceRanges(db(), req.query));
}));
v1.get('/biomarkers/dashboard', h((req, res) => {
  res.json(hos.biomarkerDashboard(db(), req.query));
}));
v1.get('/biomarkers/trends', h((req, res) => {
  res.json(hos.biomarkerTrends(db(), req.query));
}));
v1.get('/biomarkers/abnormal', h((req, res) => {
  res.json(hos.abnormalBiomarkers(db(), req.query));
}));
v1.get('/biomarkers/correlations', h((req, res) => {
  res.json(hos.biomarkerCorrelations(db(), req.query));
}));
v1.get('/biomarkers/scorecard', h((req, res) => {
  res.json(hos.biomarkerScorecard(db(), req.query));
}));
v1.get('/bloodwork/overview', h((req, res) => {
  res.json(hos.bloodworkOverview(db(), req.query));
}));
v1.get('/bloodwork/cardiometabolic', h((req, res) => {
  res.json(hos.cardiometabolicScore(db(), req.query));
}));
v1.get('/stress/summary', h((req, res) => {
  res.json(hos.stressSummary(db(), req.query));
}));
v1.get('/stress/dashboard', h((req, res) => {
  res.json(hos.stressSummary(db(), req.query));
}));
v1.get('/stress/alerts', h((req, res) => {
  res.json({ alerts: hos.stressSummary(db(), req.query).alerts });
}));
// Briefing generators — persist each result to briefing_snapshots so /history,
// /:id and /:id/diff can return a stable artifact (issue #32). Dedupe within
// the same Europe/Amsterdam day by payload_sha256, so regenerating an
// identical briefing returns the existing snapshot id rather than duplicating.
v1.get('/briefing/daily', h((_req, res) => {
  res.json(hos.briefAndSnapshot(db(), writeDb(), 'daily'));
}));
v1.get('/briefing/weekly', h((_req, res) => {
  res.json(hos.briefAndSnapshot(db(), writeDb(), 'weekly'));
}));
v1.get('/briefing/monthly', h((_req, res) => {
  res.json(hos.briefAndSnapshot(db(), writeDb(), 'monthly'));
}));
v1.get('/briefing/quarterly', h((_req, res) => {
  res.json(hos.briefAndSnapshot(db(), writeDb(), 'quarterly'));
}));
v1.get('/briefing/yearly', h((_req, res) => {
  res.json(hos.briefAndSnapshot(db(), writeDb(), 'yearly'));
}));
v1.get('/health-profile', h((_req, res) => {
  res.json(hos.healthProfile(db()));
}));
v1.get('/health-goals', h((_req, res) => {
  res.json(hos.healthGoals(db()));
}));
v1.get('/progress', h((_req, res) => {
  res.json(hos.progress(db()));
}));
v1.get('/decision-support', h((_req, res) => {
  res.json(hos.decisionSupport(db()));
}));
v1.get('/today', h((_req, res) => {
  res.json(hos.operatingSystem(db()));
}));
v1.get('/os', h((_req, res) => {
  res.json(hos.operatingSystem(db()));
}));
v1.get('/operating-system', h((_req, res) => {
  res.json(hos.operatingSystem(db()));
}));

// Full Health Intelligence Platform: Domains 14-24 and integrated workflows.
v1.get('/platform/home', h((_req, res) => {
  res.json(platform.platformHome(db()));
}));
v1.get('/track/schema', h((_req, res) => {
  res.json(platform.trackingSchema(db()));
}));
v1.get('/mood/dashboard', h((req, res) => {
  res.json(platform.moodDashboard(db(), req.query));
}));
v1.get('/wellbeing/trends', h((req, res) => {
  res.json(platform.wellbeingTrends(db(), req.query));
}));
v1.get('/symptoms/dashboard', h((req, res) => {
  res.json(platform.symptomDashboard(db(), req.query));
}));
v1.get('/body-composition/dashboard', h((req, res) => {
  res.json(platform.bodyCompositionDashboard(db(), req.query));
}));
v1.get('/sleep/advanced', h((req, res) => {
  res.json(platform.sleepAdvanced(db(), req.query));
}));
v1.get('/nutrition/intelligence', h((req, res) => {
  res.json(platform.nutritionIntelligence(db(), req.query));
}));
v1.get('/recovery/intelligence', h((req, res) => {
  res.json(platform.recoveryIntelligence(db(), req.query));
}));
v1.get('/training/intelligence', h((req, res) => {
  res.json(platform.trainingIntelligence(db(), req.query));
}));
v1.get('/longitudinal', h((req, res) => {
  res.json(platform.longitudinal(db(), req.query));
}));
v1.get('/baselines', h((req, res) => {
  res.json(platform.baselines(db(), req.query));
}));
v1.get('/risks', h((req, res) => {
  res.json(platform.risks(db(), req.query));
}));
v1.get('/insights', h((req, res) => {
  res.json(platform.insights(db(), req.query));
}));
v1.get('/insights/timeline', h((req, res) => {
  res.json(platform.insightTimeline(db(), req.query));
}));
v1.get('/insights/history', h((_req, res) => {
  res.json(platform.insightHistory(db()));
}));
