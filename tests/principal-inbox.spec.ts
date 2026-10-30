/**
 * Principal Inbox E2E tests — permission-management / approvals entry points.
 *
 * Follows the repo convention:
 *   - Uses @playwright/test directly
 *   - Skips when SMOKE_USER / SMOKE_PASS aren't set
 *   - Asserts zero 4xx/5xx responses after login
 *   - Tests the principal inbox flow through /principal/permission-management
 */
import { test, expect, type Page } from '@playwright/test';

const PRINCIPAL_USER = process.env.SMOKE_USER;
const PRINCIPAL_PASS = process.env.SMOKE_PASS;

// Helper: authenticate and return a page context
async function loginAsPrincipal(page: Page) {
  const res = await page.request.post('/api/auth/login', {
    headers: { Origin: 'http://localhost:3000', Host: 'localhost:3000' },
    data: { login: PRINCIPAL_USER!, password: PRINCIPAL_PASS! },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.data?.token).toMatch(/^eyJ/);
}

test.describe('Principal Inbox — permission management', () => {
  test.skip(!PRINCIPAL_USER || !PRINCIPAL_PASS, 'PRINCIPAL_USER / PRINCIPAL_PASS not set');

  test('permission-management page loads and shows zero failed requests', async ({ page }) => {
    const failedRequests: Array<{ status: number; url: string }> = [];
    page.on('response', (res) => {
      if (res.status() >= 400) {
        failedRequests.push({ status: res.status(), url: res.url() });
      }
    });

    await loginAsPrincipal(page);
    await page.goto('/principal/permission-management');
    await expect(page.locator('body')).toBeVisible();
    // A visible heading or content proves the page rendered.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
    expect(failedRequests, `Unexpected ${failedRequests.length} failed requests`).toEqual([]);
  });

  test('renders error boundary on API failure', async ({ page }) => {
    await page.route('**/api/principal/**', (r) => r.fulfill({ status: 500, body: '{}' }));
    await loginAsPrincipal(page);
    await page.goto('/principal/permission-management');
    await expect(page.getByText(/something went wrong|try again/i)).toBeVisible({ timeout: 10_000 });
  });

  test('navigation to principal root is reachable after login', async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto('/principal/permission-management');
    await page.locator('a[href="/principal"], a[href="#/principal"]').first().click();
    await page.waitForURL(/\/principal/);
    await expect(page.locator('body')).toBeVisible();
  });
});
