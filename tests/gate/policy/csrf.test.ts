// tests/gate/policy/csrf.test.ts
import { validateCsrf, assertCsrf } from '@/lib/csrf';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

function req(method: string, headers: Record<string, string>): any {
  return new ShimNextRequest(`http://localhost:3000/api/gate/scan`, { method, headers });
}

describe('policy/csrf', () => {
  it('GET is always exempt', () => {
    expect(validateCsrf(req('GET', {})).valid).toBe(true);
  });

  it('POST with same-origin Origin passes', () => {
    const r = validateCsrf(req('POST', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'sec-fetch-site': 'same-origin',
    }));
    expect(r.valid).toBe(true);
  });

  it('POST with foreign Origin fails', () => {
    const r = validateCsrf(req('POST', {
      origin: 'http://evil.example',
      host: 'localhost:3000',
    }));
    expect(r.valid).toBe(false);
  });

  it('POST with sec-fetch-site: cross-site fails', () => {
    const r = validateCsrf(req('POST', {
      origin: 'http://evil.college.edu',
      host: 'gate.college.edu',
      'sec-fetch-site': 'cross-site',
    }));
    expect(r.valid).toBe(false);
  });

  it('POST with no Origin and no Sec-Fetch-Site passes (same-origin browser / curl fallback)', () => {
    const r = validateCsrf(req('POST', { host: 'localhost:3000' }));
    expect(r.valid).toBe(true);
  });

  it('assertCsrf returns null on success and a 403 on failure', () => {
    expect(assertCsrf(req('GET', {}))).toBeNull();
    const blocked = assertCsrf(req('POST', { host: 'localhost:3000', origin: 'http://evil.com' }));
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(403);
  });
});
