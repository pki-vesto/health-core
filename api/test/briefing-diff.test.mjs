// Briefing diff (issue #32). Pure-function tests against synthetic prev/next
// briefings — happy path with added/removed/changed across highlights, alerts
// and decisions, and the first-ever (no prior) shape.
import { fileURLToPath } from 'node:url';
import { harness } from './fixtures.mjs';
import { diffBriefings } from '../lib/briefing-diff.js';

function brief({ highlights = [], alerts = [], decisions = [], summary = {}, period = 'daily', generated_at = '2026-06-15T08:00:00+02:00' } = {}) {
  return { period, generated_at, highlights, alerts, decisions, summary };
}

export function run() {
  const t = harness('briefing diff (#32)');

  // ── first: prev === null → { first: true, next: {…} } ─────────────────────
  {
    const next = brief({ highlights: [{ metric: 'body.weight', latest: { value: 80 }, trend: { direction: 'flat' } }] });
    const d = diffBriefings(null, next);
    t.eq('first=true with next metadata', { first: d.first, period: d.next?.period }, { first: true, period: 'daily' });
    t.ok('no highlights/alerts/decisions arrays on first', d.highlights === undefined && d.alerts === undefined && d.decisions === undefined);
  }

  // ── next === null → { first: true, empty: true } ──────────────────────────
  {
    const d = diffBriefings(null, null);
    t.eq('empty diff', d, { first: true, empty: true });
  }

  // ── happy path: highlights added/removed/changed ──────────────────────────
  {
    const prev = brief({
      highlights: [
        { metric: 'body.weight',    latest: { value: 80 }, trend: { direction: 'flat' } },
        { metric: 'sleep.duration', latest: { value: 7 },  trend: { direction: 'up' } }
      ],
      alerts: [{ type: 'chronic_stress_risk', score: 60, severity: 'medium' }],
      decisions: [{ type: 'biomarker', priority: 'monitor', message: 'CRP is above its reference range.' }]
    });
    const next = brief({
      highlights: [
        { metric: 'body.weight',     latest: { value: 81 }, trend: { direction: 'up' } },     // changed
        { metric: 'activity.steps',  latest: { value: 9000 }, trend: { direction: 'flat' } } // added
        // sleep.duration removed
      ],
      alerts: [{ type: 'chronic_stress_risk', score: 80, severity: 'high' }],                 // changed
      decisions: [
        { type: 'biomarker', priority: 'review',  message: 'CRP is above its reference range.' },         // changed (priority)
        { type: 'stress',    priority: 'review',  message: 'Stress signals are elevated.' }                // added
      ]
    });
    const d = diffBriefings(prev, next);
    t.eq('not first', d.first, false);
    t.eq('highlights added', d.highlights.added.map(h => h.metric), ['activity.steps']);
    t.eq('highlights removed', d.highlights.removed.map(h => h.metric), ['sleep.duration']);
    t.eq('highlights changed key + after', { key: d.highlights.changed[0].key, after: d.highlights.changed[0].after },
      { key: 'body.weight', after: { latest_value: 81, trend_direction: 'up' } });

    t.eq('alerts changed severity', d.alerts.changed.map(c => ({ key: c.key, before: c.before.severity, after: c.after.severity })),
      [{ key: 'chronic_stress_risk', before: 'medium', after: 'high' }]);
    t.eq('decisions added one', d.decisions.added.length, 1);
    t.eq('decisions changed priority', d.decisions.changed.map(c => ({ before: c.before.priority, after: c.after.priority })),
      [{ before: 'monitor', after: 'review' }]);
  }

  // ── identical → empty added/removed/changed across all lists ──────────────
  {
    const same = brief({
      highlights: [{ metric: 'body.weight', latest: { value: 80 }, trend: { direction: 'flat' } }],
      alerts: [], decisions: []
    });
    const d = diffBriefings(same, same);
    t.eq('identical → empty highlight delta', { added: d.highlights.added, removed: d.highlights.removed, changed: d.highlights.changed }, { added: [], removed: [], changed: [] });
    t.eq('identical → empty alerts delta', d.alerts, { added: [], removed: [], changed: [] });
    t.eq('identical → empty decisions delta', d.decisions, { added: [], removed: [], changed: [] });
    t.eq('identical → empty summary changed', d.summary, { changed: [] });
  }

  // ── summary scalar/object diff ─────────────────────────────────────────────
  {
    const d = diffBriefings(
      brief({ summary: { recovery: 60, training: 70 } }),
      brief({ summary: { recovery: 75, training: 70 } })
    );
    t.eq('summary changed only on recovery', d.summary.changed, [{ key: 'recovery', before: 60, after: 75 }]);
  }

  return t.summary();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run() ? 1 : 0);
