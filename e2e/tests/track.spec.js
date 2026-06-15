import { test, expect } from '@playwright/test';

test('track logs and corrects a manual observation without duplicates', async ({ page, request }) => {
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/#track');
  await expect(page.locator('.nav-item[data-nav="track"]')).toHaveClass(/active/);
  await expect(page.locator('#track-metric')).toBeVisible();

  await page.locator('#track-metric').selectOption('body.weight');
  const date = '2026-01-15';
  await page.locator('#track-date').fill(date);
  await page.locator('#track-value').fill('81.2');
  await page.locator('#track-note').fill('e2e eerste invoer');
  await page.locator('[data-track-submit]').click();
  await expect(page.locator('#track-msg')).toContainText('geschreven');

  await page.locator('#track-value').fill('82.4');
  await page.locator('#track-note').fill('e2e correctie');
  await page.locator('[data-track-submit]').click();
  await expect(page.locator('#track-msg')).toContainText('geschreven');
  await expect(page.locator('#screen')).toContainText('Waarde gecorrigeerd');

  const res = await request.get(`/api/v1/observations?metric=body.weight&from=${date}&to=${date}&source=manual&limit=10`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.total).toBe(1);
  expect(body.rows[0].external_id).toBe(`ui:body.weight:${date}`);
  expect(body.rows[0].value).toBe(82.4);
});
