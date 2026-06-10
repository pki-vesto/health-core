// Unit tests for the Apple Health (Auto Health Export) mapper — alias resolution
// (camelCase + synonym spellings), sleep-stage summing, daily aggregation and
// skip-unknown behaviour. Pure function; no DB needed.
import { fileURLToPath } from 'node:url';
import { mapAppleHealth } from '../lib/apple-health.js';
import { harness } from './fixtures.mjs';

export function run() {
  const t = harness('apple-health.js mapper (aliases + sleep)');

  const payload = { data: { metrics: [
    { name: 'stepCount', units: 'count', data: [                       // camelCase → step_count
      { date: '2026-05-01 09:00:00 +0000', qty: 3000 },
      { date: '2026-05-01 18:00:00 +0000', qty: 5000 } ] },            // same day → sum 8000
    { name: 'restingHeartRate', units: 'bpm', data: [                  // camelCase → resting_heart_rate
      { date: '2026-05-01 06:00:00 +0000', qty: 50 },
      { date: '2026-05-01 22:00:00 +0000', qty: 60 } ] },             // avg 55
    { name: 'heart_rate_variability_sdnn', units: 'ms', data: [        // synonym → heart.hrv_sdnn
      { date: '2026-05-01 06:00:00 +0000', qty: 40 },
      { date: '2026-05-01 07:00:00 +0000', qty: 60 } ] },             // avg 50
    { name: 'VO2Max', units: 'ml/kg/min', data: [                      // camelCase → vo2_max
      { date: '2026-05-01 08:00:00 +0000', qty: 45 } ] },
    { name: 'sleepAnalysis', units: 'hr', data: [                      // stage-only point → sum
      { date: '2026-05-01 07:00:00 +0000', deep: 1.5, rem: 1.5, core: 4 } ] }, // 7
    { name: 'sleep_analysis', units: 'hr', data: [
      { date: '2026-05-02 07:00:00 +0000', asleep: 7.5 } ] },          // direct
    { name: 'mindful_minutes', units: 'min', data: [
      { date: '2026-05-01', qty: 10 } ] }                              // unknown → skipped
  ] } };

  const { records, skipped, mappedMetrics } = mapAppleHealth(payload);
  const find = (m, d) => records.find(r => r.metric_type === m && r.timestamp === d);

  t.eq('camelCase stepCount → steps, same-day sum', find('activity.steps', '2026-05-01')?.value, 8000);
  t.eq('camelCase restingHeartRate → avg', find('heart.resting_rate', '2026-05-01')?.value, 55);
  t.eq('hrv synonym → heart.hrv_sdnn avg', find('heart.hrv_sdnn', '2026-05-01')?.value, 50);
  t.eq('camelCase VO2Max → vo2max', find('fitness.vo2max', '2026-05-01')?.value, 45);
  t.eq('sleep stages summed (deep+rem+core)', find('sleep.duration', '2026-05-01')?.value, 7);
  t.eq('sleep direct asleep', find('sleep.duration', '2026-05-02')?.value, 7.5);
  t.ok('unknown metric skipped', skipped.some(s => s.name === 'mindful_minutes'));
  t.eq('stable external_id', find('activity.steps', '2026-05-01')?.external_id, 'apple:activity.steps:2026-05-01');
  t.eq('mapped metrics complete', [...mappedMetrics].sort(),
    ['activity.steps', 'fitness.vo2max', 'heart.hrv_sdnn', 'heart.resting_rate', 'sleep.duration']);

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
