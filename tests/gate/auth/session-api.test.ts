// tests/gate/auth/session-api.test.ts
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
  checkRateLimit: jest.fn(),
  rateLimitByKey: jest.fn(),
  extractClientIp: () => '127.0.0.1',
}));
jest.mock('@/lib/postgres', () => ({
  query: jest.fn(),
  poolQuery: jest.fn(),
  withTransaction: jest.fn(),
  getPostgresPool: jest.fn(),
}));

import { GET as sessionGET } from '@/app/api/auth/session/route';
import { query } from '@/lib/postgres';
import { signAccessToken } from '@/lib/auth-token';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';
import { TEST_OPERATOR } from '../helpers/fixtures';

const mockQuery = query as jest.Mock;

async function sessionReq(cookies: Record<string, string> = {}) {
  return new ShimNextRequest('http://x/api/auth/session', {
    method: 'GET',
    cookies,
    headers: { 'content-type': 'application/json' },
  }) as any;
}

describe('GET /api/auth/session', () => {
  it('401 with no cookies', async () => {
    const res = await sessionGET(await sessionReq());
    expect(res.status).toBe(401);
  });

  it('200 with a valid access token — returns user at top level', async () => {
    const access = await signAccessToken({
      sub: TEST_OPERATOR.id,
      role: TEST_OPERATOR.role,
      email: TEST_OPERATOR.email,
      name: TEST_OPERATOR.name,
      session_version: 1,
    });
    // 1st query: users lookup
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: TEST_OPERATOR.id,
        unique_id: TEST_OPERATOR.uniqueId,
        name: TEST_OPERATOR.name,
        email: TEST_OPERATOR.email,
        role: TEST_OPERATOR.role,
        status: TEST_OPERATOR.status,
        gate_id: TEST_OPERATOR.gateId,
        session_version: 1,
      }],
      rowCount: 1,
    });
    // 2nd query: user_roles lookup
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: 'operator' }],
      rowCount: 1,
    });

    const res = await sessionGET(await sessionReq({ access_token: access }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.id).toBe(TEST_OPERATOR.id);
    expect(body.user.role).toBe('operator');
  });

  it('401 with a tampered access token', async () => {
    const access = await signAccessToken({
      sub: TEST_OPERATOR.id, role: TEST_OPERATOR.role,
    });
    const tampered = access.slice(0, -3) + 'xxx';
    const res = await sessionGET(await sessionReq({ access_token: tampered }));
    expect(res.status).toBe(401);
  });
});
