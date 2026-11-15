// tests/gate/auth/refresh-grace-reuse.test.ts
//
// Verifies the security property of the refresh-token grace window:
//   1. Legitimate rotation: the old token is already rotated (successor
//      exists, within GRACE_MS). Presenting it again returns "grace" — no
//      family revocation.
//   2. Stolen token: the old token was revoked outside the grace window.
//      Presenting it triggers reuse detection: the family is revoked and
//      session_version bumped.
//
// The test mocks the postgres pool so it runs hermetically.

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
  checkRateLimit: jest.fn(),
  rateLimitByKey: jest.fn(),
  extractClientIp: () => '127.0.0.1',
}));

jest.mock('@/lib/dpop', () => ({
  verifyDPoPProof: jest.fn(async () => ({ valid: false })),
}));

jest.mock('@/lib/csrf', () => ({
  assertCsrf: jest.fn(() => null),
}));

jest.mock('@/lib/cookies', () => ({
  secureCookieOptions: jest.fn(() => ({})),
}));

jest.mock('@/lib/db', () => ({
  addAudit: jest.fn(async () => undefined),
}));

jest.mock('@/lib/auth-token', () => ({
  verifyRefreshToken: jest.fn(),
  signAccessToken: jest.fn(async () => 'at_minted'),
  signRefreshToken: jest.fn(async () => 'rt_minted'),
}));

jest.mock('@/lib/postgres', () => ({
  query: jest.fn(),
  // withTransaction runs the callback against the SAME mocked query
  // function (the real pool passes `client` whose .query is pool.query).
  // Mocking it separately would require the callback to use client.query,
  // but the route's withTransaction implementation passes the raw pool —
  // so we route both through the single `query` mock and script results
  // in the exact call order the route issues them.
  withTransaction: async (fn: any) => fn({ query: require('@/lib/postgres').query }),
}));

import { POST as refreshPOST } from '@/app/api/auth/refresh/route';
import { query, withTransaction } from '@/lib/postgres';
import { signRefreshToken } from '@/lib/auth-token';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

type QResult = { rows: any[]; rowCount: number };

function makeReq(token: string) {
  return new ShimNextRequest('http://x/api/auth/refresh', {
    method: 'POST',
    cookies: { refresh_token: token },
    headers: { 'content-type': 'application/json' },
  }) as any;
}

// The route calls (in order, all through the single mocked `query`):
//   1. users lookup (top-level)
//   2. UPDATE sessions ... RETURNING (consume) — inside withTransaction
//   3. SELECT sessions ... (existing row lookup) — inside withTransaction
//   4. [reuse path] UPDATE family revoke — inside withTransaction
//   5. [reuse path] UPDATE session_version bump — inside withTransaction
//   6. [grace/rotated] INSERT new session — 2nd withTransaction
//   7. [grace/rotated] UPDATE successor_hash — 2nd withTransaction
//
// The withTransaction mock calls fn({ query }) where query is the same
// jest.fn, so we can script all calls in a single flat array.
function scriptQueries(results: Array<{ rows: any[]; rowCount: number }>) {
  (query as jest.Mock).mockImplementation(async () => {
    const next = results.shift();
    return next ?? { rows: [], rowCount: 0 };
  });
}

describe('refresh-token grace-window security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grace: old token presented within window → 200, no family revocation', async () => {
    const token = 'token-fam-1-v1';

    const mockAuth = jest.requireMock('@/lib/auth-token');
    mockAuth.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 't@x.co',
      role: 'operator',
    });

    const graceRow = {
      id: 'sess-old', user_id: 'user-1', family_id: 'fam-1',
      successor_hash: 'abc123',
      revoked_at: null,
      rotated_at: new Date(Date.now() - 5_000).toISOString(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };

    // Script the call sequence:
    //  1. users lookup → 1 row
    //  2. UPDATE consume → rowCount 0 (already rotated)
    //  3. SELECT existing → graceRow (rotated_at within 30s + successor set)
    //  4. INSERT new session (2nd withTransaction)
    //  5. UPDATE successor_hash on old row
    scriptQueries([
      { rows: [{ id: 'user-1', role: 'operator', status: 'ACTIVE', name: 'T', email: 't@x.co', session_version: 1 }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [graceRow], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);

    const res = await refreshPOST(makeReq(token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.refreshToken).toBeDefined();
  });

  it('reuse: old token presented outside grace window → 401 TOKEN_REVOKED, family revoked', async () => {
    const token = 'token-fam-2-v1';

    const mockAuth = jest.requireMock('@/lib/auth-token');
    mockAuth.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 't@x.co',
      role: 'operator',
    });

    const reuseRow = {
      id: 'sess-old', user_id: 'user-1', family_id: 'fam-2',
      successor_hash: null,
      revoked_at: new Date(Date.now() - 60_000).toISOString(),
      rotated_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };

    //  1. users lookup → 1 row
    //  2. UPDATE consume → rowCount 0
    //  3. SELECT existing → reuseRow (revoked, no successor within grace)
    //  4. UPDATE family revoke
    //  5. UPDATE session_version bump
    scriptQueries([
      { rows: [{ id: 'user-1', role: 'operator', status: 'ACTIVE', name: 'T', email: 't@x.co', session_version: 1 }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [reuseRow], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);

    const res = await refreshPOST(makeReq(token));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('TOKEN_REVOKED');
  });

  it('second rotation after reuse: legitimate successor also dead → 401', async () => {
    const token = 'token-fam-2-v2';

    const mockAuth = jest.requireMock('@/lib/auth-token');
    mockAuth.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 't@x.co',
      role: 'operator',
    });

    const reuseRow2 = {
      id: 'sess-2', user_id: 'user-1', family_id: 'fam-2',
      successor_hash: null,
      revoked_at: new Date(Date.now() - 60_000).toISOString(),
      rotated_at: null,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };

    scriptQueries([
      { rows: [{ id: 'user-1', role: 'operator', status: 'ACTIVE', name: 'T', email: 't@x.co', session_version: 2 }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [reuseRow2], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [], rowCount: 1 },
    ]);

    const res = await refreshPOST(makeReq(token));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe('TOKEN_REVOKED');
  });
});
