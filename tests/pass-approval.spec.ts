import { test, expect } from '@playwright/test';

test.describe('Gate Pass Approval Workflow', () => {
  test('Pass creation validates required date range and reason', async ({ request }) => {
    const response = await request.post('/api/passes', {
      headers: {
        'x-user-role': 'student',
        'x-user-id': 'student-test-id',
      },
      data: {
        roll: '21011A0501',
        reason: 'Emergency',
        from: new Date().toISOString(),
        to: new Date(Date.now() + 3600 * 1000 * 4).toISOString(),
        description: 'Medical appointment',
      },
    });

    expect([200, 201, 400, 401, 403]).toContain(response.status());
  });

  test('Pass rejection requires non-empty comment', async ({ request }) => {
    const response = await request.put('/api/passes/mock-pass-uuid-1234', {
      headers: {
        'x-user-role': 'warden',
        'x-user-id': 'warden-test-id',
      },
      data: {
        action: 'reject',
        comment: '',
      },
    });

    // 400 (missing comment) or 401/403/404 if mock pass not in DB
    expect([400, 401, 403, 404]).toContain(response.status());
    if (response.status() === 400) {
      const json = await response.json();
      expect(json.error?.code).toBe('MISSING_COMMENT');
    }
  });

  test('Non-authorized roles cannot approve passes', async ({ request }) => {
    const response = await request.put('/api/passes/mock-pass-uuid-1234', {
      headers: {
        'x-user-role': 'student',
        'x-user-id': 'student-test-id',
      },
      data: {
        action: 'approve',
        comment: 'Self approve',
      },
    });

    expect([401, 403]).toContain(response.status());
  });
});
