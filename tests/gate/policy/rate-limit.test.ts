// tests/gate/policy/rate-limit.test.ts
import { extractClientIp } from '@/lib/rate-limit';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';
import type { NextRequest } from 'next/server';

function req(headers: Record<string, string>): NextRequest {
  return new ShimNextRequest('http://x/api/test', { headers }) as unknown as NextRequest;
}

describe('policy/rate-limit — extractClientIp', () => {
  const env = process.env;
  beforeEach(() => { process.env = { ...env }; delete process.env.TRUSTED_PROXY_IPS; });
  afterAll(() => { process.env = env; });

  it('prefers X-Client-IP (Caddy-set, non-spoofable)', () => {
    expect(
      extractClientIp(req({ 'x-client-ip': '1.2.3.4', 'x-forwarded-for': 'evil, 9.9.9.9' })),
    ).toBe('1.2.3.4');
  });

  it('uses rightmost X-Forwarded-For hop when x-client-ip absent', () => {
    expect(
      extractClientIp(req({ 'x-forwarded-for': 'attacker, 5.6.7.8' })),
    ).toBe('5.6.7.8');
  });

  it('ignores x-real-ip when TRUSTED_PROXY_IPS is not set (spoofable)', () => {
    const got = extractClientIp(req({ 'x-real-ip': '6.6.6.6', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }));
    expect(got).not.toBe('6.6.6.6');
    expect(got).toBe('2.2.2.2');
  });

  it('honours x-real-ip when TRUSTED_PROXY_IPS is set', () => {
    process.env.TRUSTED_PROXY_IPS = '10.0.0.1';
    expect(
      extractClientIp(req({ 'x-real-ip': '6.6.6.6', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })),
    ).toBe('6.6.6.6');
  });

  it('returns "unknown" when no headers present', () => {
    expect(extractClientIp(req({}))).toBe('unknown');
  });
});
