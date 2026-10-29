// tests/gate/routes/verify-pass-route.test.ts
jest.mock('@/middleware/authorization', () => ({
  withAuthorization: (h: any) => h,
}));

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
}));

jest.mock('@/lib/postgres', () => ({ query: jest.fn() }));

import { GET } from '@/app/api/gate/verify-pass/route';
import { query } from '@/lib/postgres';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

const mockQuery = query as jest.Mock;

function req(qs: string) {
  return new ShimNextRequest(`http://x/api/gate/verify-pass${qs}`, { method: 'GET' }) as any;
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
