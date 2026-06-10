// Playwright config for Health Core UI coverage (tasks #11/#12).
// Point BASE_URL at a running Core (default: the demo test server on :8099).
// See e2e/README.md for how to stand up the demo server and run.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8099',
    headless: true,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
