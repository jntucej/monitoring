// tests/gate/policy/cron-auth.test.ts
import { requireCronAuth } from '@/server/http/cron-auth';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

function req(secret?: string) {
  return new ShimNextRequest('http://x/api/cron/x', {
    method: 'POST',
    headers: secret ? { 'x-cron-secret': secret } : {},
  }) as any;
}

describe('policy/cron-auth', () => {
  it('rejects a request with no x-cron-secret header', () => {
    const r = requireCronAuth(req());
    expect(r?.status).toBe(401);
  });

  it('rejects a wrong secret', () => {
    const r = requireCronAuth(req('wrong-secret'));
    expect(r?.status).toBe(401);
  });

  it('accepts the exact CRON_SECRET from env', () => {
    const r = requireCronAuth(req('jest-cron-secret'));
    expect(r).toBeNull();
  });
});
