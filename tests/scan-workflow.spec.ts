import { test, expect } from '@playwright/test';

test.describe('Gate Monitor Operator & Workflow E2E Tests', () => {
  test('Operator can log in with PIN and reach gate terminal', async ({ page }) => {
    await page.goto('/login/operator');
    await expect(page.locator('text=Gate Operator Portal')).toBeVisible();

    // Real credentials from seed data (OP-001 / default PIN)
    await page.fill('input[placeholder="Enter your identifier"]', 'OP-001');
    await page.fill('input[placeholder="Enter password or PIN"]', '12345678');
    await page.click('button[type="submit"]');

    // Session minted via Supabase Auth -> redirect to assigned gate terminal
    await expect(page).toHaveURL(/\/gate\/1/, { timeout: 15000 });
    await expect(page.locator('text=Gate 1 (Main Gate)')).toBeVisible({ timeout: 10000 });
  });

  test('Unauthenticated user is redirected to login portal', async ({ page }) => {
    await page.goto('/gate/1');

    // Should end up on the login portal selection screen
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Select Portal')).toBeVisible();
  });

  test('Health check API returns OK', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
  });
});