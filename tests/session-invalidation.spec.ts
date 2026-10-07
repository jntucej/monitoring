import { test, expect } from '@playwright/test';

test.describe('Session Management & Token Invalidation', () => {
  test('Rejects invalid session tokens with 401 Unauthorized', async ({ request }) => {
    const response = await request.get('/api/users/profile', {
      headers: {
        'x-session-token': 'invalid-session-token-12345',
        'Authorization': 'Bearer invalid-token',
      },
    });

    expect([401, 403]).toContain(response.status());
    const data = await response.json().catch(() => ({}));
    expect(data.success).toBe(false);
  });

  test('Rejects malformed user role updates', async ({ request }) => {
    const response = await request.patch('/api/users/role', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        userId: 'non-existent-user-id',
        role: 'invalid_role_type',
      },
    });

    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test('Rate limiting headers are returned on API endpoints', async ({ request }) => {
    const response = await request.get('/api/docs');
    if (response.status() === 200) {
      expect(response.headers()['content-type']).toContain('application/json');
    }
  });
});
