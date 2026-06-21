import { test, expect } from '@playwright/test';

// Task #12: quarterly + yearly briefings are present in the redesigned Reports view.
test('reports shows daily..yearly covers and opens a preview', async ({ page }) => {
  await page.goto('/#reports');
  await expect(page.locator('[data-open-report]')).toHaveCount(5);
  for (const p of ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    await expect(page.locator(`[data-open-report="${p}"]`)).toHaveCount(1);
  await page.locator('[data-open-report="quarterly"]').click();
  await expect(page.locator('.sheet .report-cover')).toBeVisible();
  await expect(page.locator('.sheet [data-report-period="quarterly"]')).toBeVisible();
  await expect(page.locator('.sheet')).toContainText('Belangrijkste signalen');
  await expect(page.locator('.sheet')).toContainText("Risico's en opvolging");
  await expect(page.locator('.sheet')).toContainText('Metadata');
  await expect(page.locator('.sheet [data-print-report]')).toBeVisible();
  await expect(page.locator('.sheet a[download="health-core-quarterly-briefing.json"]')).toHaveAttribute('href', '/api/v1/briefing/quarterly');
  await page.keyboard.press('Escape');

  await page.locator('[data-open-report="yearly"]').click();
  await expect(page.locator('.sheet [data-report-period="yearly"]')).toBeVisible();
  await expect(page.locator('.sheet a[download="health-core-yearly-briefing.json"]')).toHaveAttribute('href', '/api/v1/briefing/yearly');
});
