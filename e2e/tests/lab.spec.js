import { test, expect } from '@playwright/test';

// Lab import/review now lives under Gezondheid → Lab import tab.
test('lab tab parses the sample report into a review', async ({ page }) => {
  await page.goto('/#health');
  await page.locator('[data-health-tab="lab"]').first().click();
  await expect(page.locator('#lab-input')).toBeVisible();
  await page.locator('[data-lab-parse]').click();
  await expect(page.locator('#lab-review .labrow').first()).toBeVisible();
  await expect(page.locator('#lab-msg')).toContainText('vastlegbaar');
  await expect(page.locator('#lab-review .tag-stat').first()).toBeVisible();
});
