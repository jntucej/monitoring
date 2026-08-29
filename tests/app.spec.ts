import { test, expect } from '@playwright/test';

test.describe('Gate Monitor Application E2E Tests', () => {
  test('Homepage redirects to login page correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login page renders login form with credentials options', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Health check API returns OK', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
  });
});
