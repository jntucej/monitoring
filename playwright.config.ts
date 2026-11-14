import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Suite Configuration for Gate Pass & Attendance Monitoring System.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Prod-like harness: build + next start (NODE_ENV=production).
  // The dev server does NOT enforce the CSP middleware header, which is
  // the gap that let the P0 (force-static + strict-dynamic nonce mismatch)
  // ship under 19/19 green. `next start` runs the real middleware, so
  // the CSP header is present and the csp-paint tests actually verify
  // first-paint under the prod-like policy.
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL ? undefined : {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NODE_ENV: 'production' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
