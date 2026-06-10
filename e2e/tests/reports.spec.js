import { test, expect } from '@playwright/test';

// Task #12: quarterly + yearly briefings are present in the redesigned Reports view.
test('reports shows daily..yearly covers and opens a preview', async ({ page }) => {
  await page.goto('/#reports');
  await expect(page.locator('[data-open-report]')).toHaveCount(5);
  for (const p of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    await expect(page.locator(`[data-open-report="${p}"]`)).toHaveCount(1);
  await page.locator('[data-open-report="quarterly"]').click();
  await expect(page.locator('.sheet .report-cover')).toBeVisible();
});
