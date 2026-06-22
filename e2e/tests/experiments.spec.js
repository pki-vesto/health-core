import { test, expect } from '@playwright/test';

test('experiments view renders create flow controls and verdict surface', async ({ page }) => {
  await page.goto('/#experiments');
  await expect(page.locator('#screen')).toContainText('Nieuw experiment');
  await expect(page.locator('#exp-hypothesis')).toBeVisible();
  await expect(page.locator('#exp-intervention')).toBeVisible();
  await expect(page.locator('#exp-metric')).toBeVisible();
  await expect(page.locator('[data-exp-create]')).toBeVisible();
  await expect(page.locator('#screen')).not.toContainText('Fout bij laden');
});
