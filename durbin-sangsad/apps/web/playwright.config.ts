import { defineConfig, devices } from '@playwright/test';

/**
 * Key page flows against a production build. Locally: `pnpm --filter @durbin/web e2e`.
 * FIXTURES=1 serves TEST_ data so the suite needs no database; against a
 * seeded database the same tests assert the real counts instead.
 */
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
const port = 3100;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}${basePath}`,
    trace: 'retain-on-failure',
    // CI installs Playwright's Chromium; a developer machine uses its own Chrome.
    ...(process.env.CI ? {} : { channel: 'chrome' as const }),
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${port}`,
    url: `http://localhost:${port}${basePath || '/'}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
