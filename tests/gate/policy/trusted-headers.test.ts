// tests/gate/policy/trusted-headers.test.ts
import { signTrustedHeaders, requireTrustedHeaders } from '@/server/http/trusted-headers';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

const identity = { userId: 'U-1', role: 'operator', email: 'op@test.in' };

function req(headers: Record<string, string>): any {
  return new ShimNextRequest('http://x/api/test', { headers });
}

describe('policy/trusted-headers', () => {
  it('signs and verifies a fresh identity', () => {
    const now = Date.now();
    const sig = signTrustedHeaders(identity, now);
    const r = requireTrustedHeaders(req({
      'x-user-id': identity.userId,
      'x-user-role': identity.role,
      'x-user-email': identity.email,
      'x-mw-signature': sig,
      'x-mw-timestamp': String(now),
    }));
    expect(r).toBeNull();
  });

  it('rejects a tampered role', () => {
    const now = Date.now();
    const sig = signTrustedHeaders(identity, now);
    const r = requireTrustedHeaders(req({
      'x-user-id': identity.userId,
      'x-user-role': 'sysadmin', // tampered
      'x-user-email': identity.email,
      'x-mw-signature': sig,
      'x-mw-timestamp': String(now),
    }));
    expect(r?.status).toBe(401);
  });

  it('rejects a missing signature', () => {
    const r = requireTrustedHeaders(req({
      'x-user-id': 'U-1', 'x-user-role': 'operator', 'x-user-email': 'a@b.c',
    }));
    expect(r?.status).toBe(401);
  });

  it('rejects a stale signature (older than max age)', () => {
    const past = Date.now() - 60 * 1000; // 60s old (MAX_AGE_MS = 30s)
    const sig = signTrustedHeaders(identity, past);
    const r = requireTrustedHeaders(req({
      'x-user-id': identity.userId,
      'x-user-role': identity.role,
      'x-user-email': identity.email,
      'x-mw-signature': sig,
      'x-mw-timestamp': String(past),
    }));
    expect(r?.status).toBe(401);
  });
});
