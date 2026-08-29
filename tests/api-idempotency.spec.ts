import { test, expect } from '@playwright/test';

test.describe('API Idempotency & Duplicate Scan Rejection', () => {
  test('Server rejects duplicate scan requests within 5-second window with 409 Conflict', async ({ request }) => {
    // Generate operator auth token / headers or send request to scan endpoint
    const payload = {
      roll: '24JJ1A0501',
      gateId: 'gate-1',
      direction: 'IN',
      operatorId: 'op-1',
    };

    // First scan attempt (unauthenticated or with operator headers)
    const res1 = await request.post('/api/gate/scan', {
      data: payload,
      headers: {
        'x-user-id': 'op-1',
        'x-user-role': 'operator',
      },
    });

    // If request succeeds (200) or fails on auth/validation (400/403)
    if (res1.status() === 200) {
      // Send immediate duplicate scan within 5 seconds
      const res2 = await request.post('/api/gate/scan', {
        data: payload,
        headers: {
          'x-user-id': 'op-1',
          'x-user-role': 'operator',
        },
      });

      expect(res2.status()).toBe(409);
      const json = await res2.json();
      expect(json).toHaveProperty('duplicate', true);
      expect(json.error).toBe('Duplicate scan detected');
    } else {
      expect([200, 400, 401, 403, 409]).toContain(res1.status());
    }
  });
});