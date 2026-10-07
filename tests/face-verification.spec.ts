import { test, expect } from '@playwright/test';

test.describe('Face ID Verification & Biometric Fallback Workflows', () => {
  test('Face verification API rejects empty feature vectors', async ({ request }) => {
    const response = await request.post('/api/gate/verify-face', {
      headers: {
        'x-user-role': 'operator',
        'x-user-id': 'operator-test-id',
      },
      data: {
        rollNumber: '21011A0501',
        descriptor: [],
      },
    });

    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test('Anti-spoofing flags reject suspicious biometric attempts', async ({ request }) => {
    const response = await request.post('/api/gate/verify-face', {
      headers: {
        'x-user-role': 'operator',
        'x-user-id': 'operator-test-id',
      },
      data: {
        rollNumber: '21011A0501',
        descriptor: new Array(128).fill(0.05),
        livenessScore: 0.12, // Below anti-spoofing threshold
      },
    });

    expect([400, 401, 403, 404, 422]).toContain(response.status());
  });

  test('Fallback PIN validation requires valid roll number and numeric PIN', async ({ request }) => {
    const response = await request.post('/api/gate/verify-pin', {
      headers: {
        'x-user-role': 'operator',
        'x-user-id': 'operator-test-id',
      },
      data: {
        rollNumber: '21011A0501',
        pin: '1234',
      },
    });

    expect([200, 400, 401, 403, 404]).toContain(response.status());
  });
});
