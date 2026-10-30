/**
 * Principal Delegation E2E tests — delegation-manager and approvals sub-pages.
 *
 * Follows repo convention:
 *   - Uses @playwright/test directly
 *   - Gated by SMOKE_USER / SMOKE_PASS
 *   - Checks zero 4xx/5xx on load
 */
import { test, expect, type Page } from '@playwright/test';

const PRINCIPAL_USER = process.env.SMOKE_USER;
const PRINCIPAL_PASS = process.env.SMOKE_PASS;

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

test.describe('Principal Delegation — delegation manager', () => {
  test.skip(!PRINCIPAL_USER || !PRINCIPAL_PASS, 'PRINCIPAL_USER / PRINCIPAL_PASS not set');

  test('delegation-manager page loads with zero failed requests', async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on('response', (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await loginAsPrincipal(page);
    await page.goto('/principal/delegation-manager');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
    expect(failed).toEqual([]);
  });

  test('approvals/all sub-page loads', async ({ page }) => {
    const failed: Array<{ status: number; url: string }> = [];
    page.on('response', (res) => {
      if (res.status() >= 400) failed.push({ status: res.status(), url: res.url() });
    });
    await loginAsPrincipal(page);
    await page.goto('/principal/approvals/all');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
    expect(failed).toEqual([]);
  });

  test('render error boundary on API failure for delegation-manager', async ({ page }) => {
    await page.route('**/api/principal/**', (r) => r.fulfill({ status: 500, body: '{}' }));
    await loginAsPrincipal(page);
    await page.goto('/principal/delegation-manager');
    await expect(page.getByText(/something went wrong|try again/i)).toBeVisible({ timeout: 10_000 });
  });

  test('navigates from principal root to delegation-manager', async ({ page }) => {
    await loginAsPrincipal(page);
    await page.goto('/principal');
    await page.locator('a[href="/principal/delegation-manager"]').first().click();
    await page.waitForURL(/\/principal\/delegation-manager/);
    await expect(page.locator('body')).toBeVisible();
  });
});
