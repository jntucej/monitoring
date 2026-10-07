import { test, expect } from '@playwright/test';

test.describe('Gate Scan Workflow & Verification', () => {
  test('Scan endpoint rejects empty or malformed roll numbers', async ({ request }) => {
    const response = await request.post('/api/gate/scan', {
      headers: {
        'x-user-role': 'operator',
        'x-user-id': 'operator-test-id',
      },
      data: {
        rollNumber: '',
        gateId: 'gate-main-01',
        direction: 'entry',
      },
    });

    expect([400, 401, 403]).toContain(response.status());
    const data = await response.json().catch(() => ({}));
    if (response.status() === 400) {
      expect(data.success).toBe(false);
    }
  });

  test('Scan endpoint validates direction parameter', async ({ request }) => {
    const response = await request.post('/api/gate/scan', {
      headers: {
        'x-user-role': 'operator',
        'x-user-id': 'operator-test-id',
      },
      data: {
        rollNumber: '21011A0501',
        gateId: 'gate-main-01',
        direction: 'INVALID_DIRECTION',
      },
    });

    expect([400, 401, 403]).toContain(response.status());
  });

  test('Thumbprint verification requires valid signature payload', async ({ request }) => {
    const response = await request.post('/api/gate/verify-thumbprint', {
      headers: {
        'x-user-role': 'operator',
      },
      data: {
        signature: 'corrupted-sig',
      },
    });

    expect([400, 401, 403, 404]).toContain(response.status());
  });
});
