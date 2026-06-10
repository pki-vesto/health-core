import { test, expect } from '@playwright/test';

test('theme toggle switches and persists across reload', async ({ page }) => {
  await page.goto('/#today');
  const initial = await page.locator('html').getAttribute('data-theme');
  const toggled = initial === 'dark' ? 'light' : 'dark';
  await page.locator('[data-theme-toggle]').first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', toggled);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', toggled);
});

test('settings can change accent + density', async ({ page }) => {
  await page.goto('/#settings');
  await page.locator('[data-set-density="comfy"]').click();
  await expect(page.locator('[data-set-density="comfy"]')).toHaveClass(/on/);
  await page.locator('[data-set-accent]').nth(2).click();
  await expect(page.locator('[data-set-accent].on')).toHaveCount(1);
});
