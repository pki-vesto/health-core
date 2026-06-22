import { test, expect } from '@playwright/test';

const populatedToday = {
  status: 'operational',
  today: {
    generated_at: '2026-06-20T08:00:00+02:00',
    summary: { text: 'Daily digest: sleep is stable, stress needs attention, and protein is on target.' },
    highlights: [
      { title: 'Stress elevated', detail: 'Recovery window is tighter than usual.', priority: 'review' },
      { title: 'Protein on target', detail: '180g against the daily target.', priority: 'low' }
    ],
    goals_due: [
      { title: 'Recovery reset', detail: 'HRV goal is off-track today.', status: 'off_track' }
    ],
    goal_progress: [
      { title: 'Protein target', current: 180, target: 190, unit: 'g', streak: 5, streak_unit: 'dagen' }
    ],
    streaks: [
      { title: 'Morning weigh-in', days: 12, unit: 'dagen' }
    ],
    disclaimer: 'Informational context derived from your own data. It does not replace medical advice or provide a diagnosis.'
  },
  decision_support: {
    recommendations: [
      { rec_key: 'stress:overall', type: 'stress', priority: 'review', message: 'Stress signals are elevated relative to recent recovery.' },
      { rec_key: 'biomarker:blood.crp', type: 'biomarker', priority: 'monitor', message: 'CRP is above its reference range.' }
    ],
    note: 'Informational context derived from your own data.'
  },
  progress: {
    goals: { complete: 249, total: 250 }
  }
};

async function mockToday(page, body) {
  await page.route('**/api/v1/today', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('today tab loads digest, recommendations, goal progress and disclaimer', async ({ page }) => {
  await mockToday(page, populatedToday);

  await page.goto('/#today');

  await expect(page.locator('.nav-item[data-nav="today"]')).toHaveClass(/active/);
  await expect(page.getByTestId('today-view')).toBeVisible();
  await expect(page.locator('#screen')).toContainText('Daily digest');
  await expect(page.locator('#screen')).toContainText('Stress elevated');
  await expect(page.getByTestId('today-recommendations')).toContainText('Stress signals are elevated');
  await expect(page.getByTestId('today-goal-progress')).toContainText('Protein target');
  await expect(page.getByTestId('today-goal-progress')).toContainText('180 / 190 g');
  await expect(page.getByTestId('today-goal-progress')).toContainText('95%');
  await expect(page.getByTestId('today-disclaimer')).toContainText('does not replace medical advice');
});

test('recommendation action posts and removes the active item', async ({ page }) => {
  await mockToday(page, populatedToday);
  const actions = [];
  await page.route('**/api/v1/recommendations/**/action', async (route) => {
    actions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await page.goto('/#today');
  const rec = page.locator('.today-rec[data-rec-key="stress:overall"]');
  await expect(rec).toBeVisible();

  await rec.locator('[data-rec-action="done"]').click();

  await expect(rec).toHaveCount(0);
  expect(actions).toEqual([{ status: 'done' }]);
  await expect(page.locator('#today-rec-count')).toHaveText('1');
  await expect(page.getByTestId('today-recommendations')).not.toContainText('Stress signals are elevated');
});

test('today empty-state renders without active content', async ({ page }) => {
  await mockToday(page, {
    status: 'operational',
    today: {
      generated_at: '2026-06-20T08:00:00+02:00',
      summary: {},
      highlights: [],
      disclaimer: 'Informational context derived from your own data.'
    },
    decision_support: { recommendations: [], note: 'Informational context derived from your own data.' },
    progress: { goals: {} }
  });

  await page.goto('/#today');

  await expect(page.getByTestId('today-view')).toBeVisible();
  await expect(page.getByTestId('today-recommendations')).toContainText('Geen open aanbevelingen');
  await expect(page.getByTestId('today-goals-due')).toContainText('Geen doelen off-track');
  await expect(page.getByTestId('today-goal-progress')).toContainText('Nog geen goal progress');
  await expect(page.getByTestId('today-disclaimer')).toBeVisible();
});
