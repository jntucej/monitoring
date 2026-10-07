import { test, expect } from '@playwright/test';

test.describe('App Sanity & Navigation Tests', () => {
  test('Health check / public landing responds successfully', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/Monitoring|Gate|Campus|Login/i);
  });

  test('Public routes block unauthorized API access', async ({ request }) => {
    const response = await request.get('/api/users');
    expect([401, 403]).toContain(response.status());
  });

  test('Public gate scan endpoint requires valid payload and authentication', async ({ request }) => {
    const response = await request.post('/api/gate/scan', {
      data: {},
    });
    expect([400, 401, 403]).toContain(response.status());
  });
});
