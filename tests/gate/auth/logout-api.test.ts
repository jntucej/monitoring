// tests/gate/auth/logout-api.test.ts
jest.mock('@/lib/rate-limit', () => ({ withRateLimit: (h: any) => h }));
jest.mock('@/lib/postgres', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

describe('POST /api/auth/logout', () => {
  it('clears both cookies', async () => {
    const req = new ShimNextRequest('http://x/api/auth/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    }) as any;
    const res = await logoutPOST(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/access_token=;/);
    expect(setCookie).toMatch(/refresh_token=;/);
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});
