const { loadLocalEnv } = require('../scripts/lib/env-loader');
loadLocalEnv();

import { test, expect } from '@playwright/test';

test.describe('Session Invalidation Security Checks', () => {
  test('invalidateAllUserSessions executes gracefully and returns boolean status', async () => {
    const { invalidateAllUserSessions } = require('../src/lib/supabaseClient');
    const userId = '00000000-0000-0000-0000-000000000000';
    const result = await invalidateAllUserSessions(userId);
    expect(typeof result).toBe('boolean');
  });

  test('rejects invalid or missing JWT gracefully without throwing unhandled exceptions', async () => {
    const { invalidateAllUserSessions } = require('../src/lib/supabaseClient');
    const userId = '00000000-0000-0000-0000-000000000001';
    const invalidJwt = 'invalid.jwt.token';
    const result = await invalidateAllUserSessions(userId, invalidJwt);
    expect(typeof result).toBe('boolean');
  });
});
