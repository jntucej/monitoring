// tests/gate/auth/login-api.test.ts
// Drives the real POST /api/auth/login handler with a mocked DB + hasher.
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
  checkRateLimit: jest.fn().mockResolvedValue({ limited: false }),
  rateLimitByKey: jest.fn().mockResolvedValue({ limited: false }),
  extractClientIp: () => '127.0.0.1',
}));

jest.mock('@/lib/csrf', () => ({ assertCsrf: () => null }));
jest.mock('@/lib/dpop', () => ({ verifyDPoPProof: jest.fn() }));
jest.mock('@/lib/deception', () => ({
  isHoneytokenIdentifier: jest.fn().mockReturnValue(false),
  triggerDeceptionAlert: jest.fn(),
}));
jest.mock('@/lib/login-lockout');
jest.mock('@/lib/postgres', () => ({
  query: jest.fn(),
  poolQuery: jest.fn(),
  withTransaction: jest.fn(),
  getPostgresPool: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  addAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth-token', () => {
  const real = jest.requireActual('@/lib/auth-token');
  return {
    ...real,
    verifyPassword: jest.fn(),
  };
});

import { POST as loginPOST } from '@/app/api/auth/login/route';
import { query } from '@/lib/postgres';
import { verifyPassword } from '@/lib/auth-token';
import {
  checkLockout, recordFailedAttempt, clearLockout,
} from '@/lib/login-lockout';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';
import { TEST_OPERATOR } from '../helpers/fixtures';

const mockQuery             = query as jest.Mock;
const mockVerifyPassword    = verifyPassword as jest.Mock;
const mockCheckLockout      = checkLockout as jest.Mock;
const mockRecordFailed      = recordFailedAttempt as jest.Mock;
const mockClearLockout      = clearLockout as jest.Mock;

function loginReq(body: { login: string; password: string }) {
  return new ShimNextRequest('http://x/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://x', host: 'x' },
    body: JSON.stringify(body),
  }) as any;
}

function operatorRow() {
  return {
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
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckLockout.mockResolvedValue({ locked: false });
  mockRecordFailed.mockResolvedValue(undefined);
  mockClearLockout.mockResolvedValue(undefined);
});

describe('POST /api/auth/login — operator gate-end journey', () => {
  it('mints a session for a valid operator', async () => {
    // 1st query: users lookup
    mockQuery.mockResolvedValueOnce({ rows: [operatorRow()], rowCount: 1 });
    // 2nd query: user_roles lookup
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'operator' }], rowCount: 1 });
    mockVerifyPassword.mockResolvedValueOnce(true);

    const res = await loginPOST(loginReq({
      login: 'OPERATOR', password: 'correct-password',
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe('operator');
    expect(body.data.user.id).toBe(TEST_OPERATOR.id);

    // Access + refresh cookies set
    const cookies = res.headers.get('set-cookie') ?? '';
    expect(cookies).toMatch(/access_token=/);
    expect(cookies).toMatch(/refresh_token=/);
    expect(cookies).toMatch(/HttpOnly/i);
  });

  it('401 for a wrong password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [operatorRow()], rowCount: 1 });
    mockVerifyPassword.mockResolvedValueOnce(false);

    const res = await loginPOST(loginReq({
      login: 'OPERATOR', password: 'wrong',
    }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mockRecordFailed).toHaveBeenCalled();
  });

  it('401 for a nonexistent user (constant timing — verifyPassword still runs)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockVerifyPassword.mockResolvedValueOnce(false);

    const res = await loginPOST(loginReq({
      login: 'GHOST', password: 'whatever',
    }));
    expect(res.status).toBe(401);
    expect(mockVerifyPassword).toHaveBeenCalled();
  });

  it('429 when the identifier is locked out', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [operatorRow()], rowCount: 1 });
    mockCheckLockout.mockResolvedValueOnce({
      locked: true, retryAfterSeconds: 300, until: new Date(Date.now() + 300_000),
    });

    const res = await loginPOST(loginReq({
      login: 'OPERATOR', password: 'anything',
    }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(JSON.stringify(body)).toMatch(/lock/i);
  });

  it('does NOT leak which of user/password was wrong', async () => {
    // Wrong user
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockVerifyPassword.mockResolvedValueOnce(false);
    const r1 = await loginPOST(loginReq({ login: 'GHOST', password: 'x' }));
    const b1 = await r1.json();

    // Wrong password (real user)
    mockQuery.mockResolvedValueOnce({ rows: [operatorRow()], rowCount: 1 });
    mockVerifyPassword.mockResolvedValueOnce(false);
    const r2 = await loginPOST(loginReq({ login: 'OPERATOR', password: 'x' }));
    const b2 = await r2.json();

    expect(r1.status).toBe(r2.status);
    expect(b1.error?.code).toBe(b2.error?.code);
    expect(b1.error?.message).toBe(b2.error?.message);
  });

  it('rejects a suspended operator (cannot sign in)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...operatorRow(), status: 'SUSPENDED' }],
      rowCount: 1,
    });

    const res = await loginPOST(loginReq({
      login: 'OPERATOR', password: 'correct',
    }));
    expect(res.status).toBe(403);
  });
});
