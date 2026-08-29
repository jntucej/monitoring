import { test, expect } from '@playwright/test';

test.describe('Always-Online Network Status & Resilience Tests', () => {
  test('Health check API endpoint responds with healthy 200 status', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('status');
  });
});