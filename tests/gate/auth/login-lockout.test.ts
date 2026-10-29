// tests/gate/auth/login-lockout.test.ts
jest.mock('@/lib/dbClient', () => ({
  getSupabaseServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
      upsert: async () => ({}),
      update: () => ({ eq: () => ({}) }),
    }),
  }),
}));
jest.mock('@/lib/postgres', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

import { checkLockout, recordFailedAttempt, clearLockout } from '@/lib/login-lockout';

describe('login-lockout (behavioral contract)', () => {
  it('recordFailedAttempt is a no-throw for a fresh identifier', async () => {
    await expect(recordFailedAttempt('OPERATOR', 'password')).resolves.toBeUndefined();
  });

  it('clearLockout is safe when no row exists', async () => {
    await expect(clearLockout('OPERATOR')).resolves.toBeUndefined();
  });

  it('checkLockout returns a shape callers can consume', async () => {
    const state = await checkLockout('OPERATOR');
    expect(state).toHaveProperty('locked');
    expect(typeof state.locked).toBe('boolean');
  });
});
