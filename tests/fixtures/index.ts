/**
 * Playwright shared fixtures — Issue #401.
 *
 * `failedRequests` captures every 4xx/5xx network response during a test so
 * that silent server errors which don't crash the UI are still caught.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *   test('dashboard loads clean', async ({ page, failedRequests }) => {
 *     await page.goto('/admin');
 *     expect(failedRequests).toEqual([]);
 *   });
 */
import { test as base, expect } from '@playwright/test';

interface FailedRequest {
  status: number;
  method: string;
  url: string;
}

export const test = base.extend<{ failedRequests: FailedRequest[] }>({
  failedRequests: async ({ page }, use) => {
    const failures: FailedRequest[] = [];

    page.on('response', (response) => {
      const status = response.status();
      // Only capture unexpected errors — not known auth redirects
      if (status >= 400) {
        failures.push({
          status,
          method: response.request().method(),
          url: response.url(),
        });
      }
    });

    await use(failures);

    // On test failure, log what network errors occurred for easier debugging
    if (failures.length > 0) {
      console.error('[fixture:failedRequests] Network errors during test:');
      for (const f of failures) {
        console.error(`  ${f.status} ${f.method} ${f.url}`);
      }
    }
  },
});

export { expect };
