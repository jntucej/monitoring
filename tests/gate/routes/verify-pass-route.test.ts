// tests/gate/routes/verify-pass-route.test.ts
jest.mock('@/middleware/authorization', () => ({
  withAuthorization: (h: any) => h,
}));

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
}));

jest.mock('@/lib/postgres', () => ({ query: jest.fn() }));

import { createHmac } from 'crypto';
import { GET, POST } from '@/app/api/gate/verify-pass/route';
import { query } from '@/lib/postgres';
import { validateQrToken } from '@/lib/qr-token';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

jest.mock('@/lib/qr-token', () => ({
  validateQrToken: jest.fn(),
}));

const mockQuery = query as jest.Mock;
const mockValidateQrToken = validateQrToken as jest.Mock;

function req(qs: string) {
  return new ShimNextRequest(`http://x/api/gate/verify-pass${qs}`, { method: 'GET' }) as any;
}

function postReq(body: any) {
  return new ShimNextRequest(`http://x/api/gate/verify-pass`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/gate/verify-pass', () => {
  it('400s when roll is missing', async () => {
    const res = await GET(req(''), { auth: { userId: 'OP', role: 'operator', gateId: 'G-1' } as any });
    expect(res.status).toBe(400);
  });

  it('returns 404 when no approved pass exists', async () => {
    // 1st query: find user
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'U-1', status: 'ACTIVE' }] });
    // 2nd query: modern permissions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 3rd query: legacy gate_passes
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await GET(req('?roll=24JJ1A0501&reason=home_out'),
      { auth: { userId: 'OP', role: 'operator', gateId: 'G-1' } as any });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('NO_APPROVED_PASS');
  });

  it('returns pass when an approved pass is inside the window', async () => {
    const now = Date.now();
    // 1st query: find user
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'U-1', status: 'ACTIVE' }] });
    // 2nd query: modern permissions
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 'P-1', ticket_number: 'HST-1', status: 'APPROVED',
      from_date: new Date(now - 60_000).toISOString(),
      to_date: new Date(now + 60_000).toISOString(),
      used_at: null, reason: 'home_out',
    }]});

    const res = await GET(req('?roll=24JJ1A0501&reason=home_out'),
      { auth: { userId: 'OP', role: 'operator', gateId: 'G-1' } as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.pass.ticketNumber).toBe('HST-1');
  });
});

describe('POST /api/gate/verify-pass', () => {
  it('400s when token is missing', async () => {
    const res = await POST(postReq({}), { auth: { userId: 'OP', role: 'operator' } as any });
    expect(res.status).toBe(400);
  });

  it('verifies 3-part Student ID JWT and returns roll', async () => {
    mockValidateQrToken.mockResolvedValueOnce({
      sub: 'U-STUDENT',
      roll: '24JJ1A0501',
      purpose: 'qr_verification',
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'U-STUDENT', unique_id: '24JJ1A0501', status: 'ACTIVE' }],
    });

    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJVLVNUVURFTlQifQ.fakeSignature';
    const res = await POST(postReq({ token: fakeJwt }), {
      auth: { userId: 'OP', role: 'operator' } as any,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.roll).toBe('24JJ1A0501');
    expect(body.data.type).toBe('student_id');
  });

  it('verifies 2-part signed pass token and returns roll & pass details', async () => {
    const secret = process.env.QR_TOKEN_SECRET || 'jest-qr-token-secret-bbbbbbbbbbbbbbbbbbb';
    const payloadObj = {
      v: 1,
      jti: 'jti-123',
      sub: 'U-STUDENT',
      tkt: 'HST-9999',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const b64 = Buffer.from(payloadStr).toString('base64url');
    const sig = createHmac('sha256', secret).update(payloadStr).digest('base64url');
    const token = `${b64}.${sig}`;

    const now = Date.now();
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'P-99',
          ticket_number: 'HST-9999',
          status: 'APPROVED',
          used_at: null,
          from_date: new Date(now - 60_000).toISOString(),
          to_date: new Date(now + 60_000).toISOString(),
          roll: '24JJ1A0501',
          reason: 'home_out',
        },
      ],
    });

    const res = await POST(postReq({ token: `mycampus:pass:${token}` }), {
      auth: { userId: 'OP', role: 'operator' } as any,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.roll).toBe('24JJ1A0501');
    expect(body.data.ticketNumber).toBe('HST-9999');
    expect(body.data.type).toBe('pass');
  });
});
