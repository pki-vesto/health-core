import { test, expect } from '@playwright/test';

const VIEWS = ['today', 'track', 'insights', 'trends', 'recovery', 'training', 'nutrition', 'health', 'experiments', 'reports', 'datacore', 'settings'];

test('shell renders: sidebar, brand, all nav items, today hero', async ({ page }) => {
  await page.goto('/#today');
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.brand-name')).toHaveText('Health Core');
  for (const id of VIEWS) await expect(page.locator(`.nav-item[data-nav="${id}"]`)).toHaveCount(1);
  await expect(page.locator('#screen .today-hero')).toBeVisible();
  await expect(page.locator('#screen')).toContainText('Health OS');
  await expect(page.locator('#screen')).toContainText('Open aanbevelingen');
  await expect(page.locator('#screen')).not.toContainText('Fout bij laden');
});
