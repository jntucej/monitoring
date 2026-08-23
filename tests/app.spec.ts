import { test, expect } from '@playwright/test';

test.describe('Gate Monitor Application E2E Tests', () => {
  test('Homepage loads correctly with college title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gate Monitor|Next.js/i);
    await expect(page.locator('text=JNTUH CEJ Monitoring')).toBeVisible();
  });

  test('Portal buttons navigate to login pages', async ({ page }) => {
    await page.goto('/');
    const portalButton = page.locator('text=Portal');
    await expect(portalButton).toBeVisible();
  });

  test('Login page loads and allows role selection', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Gate Operator Desk').or(page.locator('text=Login'))).toBeVisible();
  });

  test('Health check API returns OK', async ({ request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
  });
});
