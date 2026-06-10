import { test, expect } from '@playwright/test';

const VIEWS = ['today', 'insights', 'trends', 'recovery', 'training', 'nutrition', 'health', 'experiments', 'reports', 'datacore', 'settings'];

test('every view navigates via the sidebar and renders without error', async ({ page }) => {
  await page.goto('/#today');
  await page.waitForSelector('.sidebar');
  for (const v of VIEWS) {
    await page.locator(`.nav-item[data-nav="${v}"]`).click();
    await expect(page.locator(`.nav-item[data-nav="${v}"]`)).toHaveClass(/active/);
    await expect(page.locator('#screen .card, #screen .empty, #screen .future').first()).toBeVisible();
    await expect(page.locator('#screen')).not.toContainText('Fout bij laden');
    await expect(page.locator('#screen')).not.toContainText('Health Core laden');
  }
});

test('domain screens render charts/tiles', async ({ page }) => {
  for (const v of ['trends', 'recovery', 'nutrition']) {
    await page.goto('/#' + v);
    await expect(page.locator('#screen .card').first()).toBeVisible();
    await expect(page.locator('#screen svg').first()).toBeVisible();
  }
});
