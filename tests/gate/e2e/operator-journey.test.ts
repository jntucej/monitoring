// tests/gate/e2e/operator-journey.test.ts
// The full operator gate-end journey, in ONE test, at the route handler level:
//   login → session → scan (IN) → session still valid → logout → session 401.
// No DB, no Docker. Real JWT signing. Real scan orchestration (mocked repos).
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
  checkRateLimit: jest.fn().mockResolvedValue({ limited: false }),
  rateLimitByKey: jest.fn().mockResolvedValue({ limited: false }),
  extractClientIp: () => '127.0.0.1',
}));

jest.mock('@/lib/csrf', () => ({ assertCsrf: () => null }));
jest.mock('@/lib/dpop', () => ({ verifyDPoPProof: jest.fn() }));
jest.mock('@/lib/deception', () => ({
  isHoneytokenIdentifier: () => false,
  triggerDeceptionAlert: jest.fn(),
}));
jest.mock('@/lib/login-lockout', () => ({
  checkLockout: jest.fn().mockResolvedValue({ locked: false }),
  recordFailedAttempt: jest.fn(),
  clearLockout: jest.fn(),
}));
jest.mock('@/lib/postgres', () => ({
  query: jest.fn(),
  poolQuery: jest.fn(),
  withTransaction: jest.fn(),
  getPostgresPool: jest.fn(),
}));
jest.mock('@/lib/auth-token', () => {
  const real = jest.requireActual('@/lib/auth-token');
  return { ...real, verifyPassword: jest.fn().mockResolvedValue(true) };
});
jest.mock('@/server/services/scan/record', () => ({
  recordScan: jest.fn().mockResolvedValue({
    log: { id: 'S-1', user_id: 'STU-1', direction: 'IN', timestamp: new Date().toISOString() },
    isDuplicate: false,
    consumedPassId: null,
    person: {
      id: 'STU-1', uniqueId: '24JJ1A0501', name: 'Ravi Kumar',
      role: 'student', status: 'ACTIVE', photoUrl: null,
    },
  }),
}));

import { POST as loginPOST } from '@/app/api/auth/login/route';
import { GET as sessionGET } from '@/app/api/auth/session/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { POST as scanPOST } from '@/app/api/gate/scan/route';
import { query } from '@/lib/postgres';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';
import { TEST_OPERATOR, TEST_STUDENT } from '../helpers/fixtures';

const mockQuery = query as jest.Mock;

function parseSetCookies(setCookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!setCookieHeader) return out;
  for (const line of setCookieHeader.split(/,(?=[^;]+=[^;]+)/)) {
    const m = line.match(/^\s*([^=]+)=([^;]*)/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

it('operator journey: login → session → scan → session → logout', async () => {
  // ── Step 1: Login ─────────────────────────────────────────────────
  // 1. users lookup
  mockQuery.mockResolvedValueOnce({
    rows: [{
      id: TEST_OPERATOR.id,
      unique_id: TEST_OPERATOR.uniqueId,
      name: TEST_OPERATOR.name,
      email: TEST_OPERATOR.email,
      role: TEST_OPERATOR.role,
      status: TEST_OPERATOR.status,
      gate_id: TEST_OPERATOR.gateId,
      password_hash: TEST_OPERATOR.passwordHash,
      session_version: 1,
      department_id: null,
      employee_id: null,
      handle: null,
      supervised_gates: null,
      login_identifier: null,
    }],
    rowCount: 1,
  });
  // 2. user_roles lookup
  mockQuery.mockResolvedValueOnce({ rows: [{ role: 'operator' }], rowCount: 1 });

  const loginReq = new ShimNextRequest('http://x/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://x', host: 'x' },
    body: JSON.stringify({ login: TEST_OPERATOR.uniqueId, password: 'ok' }),
  }) as any;

  const loginRes = await loginPOST(loginReq);
  expect(loginRes.status).toBe(200);
  const loginBody = await loginRes.json();
  expect(loginBody.data.user.role).toBe('operator');
  expect(loginBody.data.user.id).toBe(TEST_OPERATOR.id);

  const cookies = parseSetCookies(loginRes.headers.get('set-cookie'));
  expect(cookies.access_token).toBeTruthy();
  expect(cookies.refresh_token).toBeTruthy();

  // ── Step 2: Session with the fresh cookies ────────────────────────
  // 1. users lookup
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
  // 2. user_roles lookup
  mockQuery.mockResolvedValueOnce({ rows: [{ role: 'operator' }], rowCount: 1 });

  const sessionRes = await sessionGET(new ShimNextRequest('http://x/api/auth/session', {
    method: 'GET',
    cookies: { access_token: cookies.access_token, refresh_token: cookies.refresh_token },
  }) as any);
  expect(sessionRes.status).toBe(200);
  const sessionBody = await sessionRes.json();
  expect(sessionBody.user.id).toBe(TEST_OPERATOR.id);

  // ── Step 3: Scan the student ──────────────────────────────────────
  // 1. requireAuthUser -> getUserRowCached
  mockQuery.mockResolvedValueOnce({
    rows: [{
      id: TEST_OPERATOR.id,
      role: TEST_OPERATOR.role,
      status: TEST_OPERATOR.status,
      email: TEST_OPERATOR.email,
      session_version: 1,
      unique_id: TEST_OPERATOR.uniqueId,
      gate_id: TEST_OPERATOR.gateId,
    }],
    rowCount: 1,
  });
  // 2. user_roles lookup
  mockQuery.mockResolvedValueOnce({ rows: [{ role: 'operator' }], rowCount: 1 });
  // 3. gate lookup from users table in scan route handler
  mockQuery.mockResolvedValueOnce({ rows: [{ gate_id: TEST_OPERATOR.gateId }] });

  const scanReq = new ShimNextRequest('http://x/api/gate/scan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${cookies.access_token}`,
    },
    cookies: { access_token: cookies.access_token },
    body: JSON.stringify({
      roll: TEST_STUDENT.uniqueId,
      direction: 'IN',
      entryType: 'hosteller',
      gateId: TEST_OPERATOR.gateId,
    }),
  }) as any;

  const scanRes = await scanPOST(scanReq);
  expect(scanRes.status).toBe(200);
  const scanBody = await scanRes.json();
  expect(scanBody.success).toBe(true);
  expect(scanBody.data.scan.id).toBe('S-1');
  expect(scanBody.data.person.uniqueId).toBe(TEST_STUDENT.uniqueId);

  // ── Step 4: Session still valid after the scan ────────────────────
  // 1. users lookup
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
  // 2. user_roles lookup
  mockQuery.mockResolvedValueOnce({ rows: [{ role: 'operator' }], rowCount: 1 });

  const session2 = await sessionGET(new ShimNextRequest('http://x/api/auth/session', {
    method: 'GET',
    cookies: { access_token: cookies.access_token },
  }) as any);
  expect(session2.status).toBe(200);

  // ── Step 5: Logout ────────────────────────────────────────────────
  const logoutRes = await logoutPOST(new ShimNextRequest('http://x/api/auth/logout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  }) as any);
  expect(logoutRes.status).toBe(200);
  const setCookies = logoutRes.headers.get('set-cookie') ?? '';
  expect(setCookies).toMatch(/access_token=;/);
  expect(setCookies).toMatch(/Max-Age=0/);

  // ── Step 6: Session now rejected (cookies cleared) ────────────────
  const afterLogout = await sessionGET(new ShimNextRequest('http://x/api/auth/session', {
    method: 'GET',
    cookies: {},
  }) as any);
  expect(afterLogout.status).toBe(401);
});
