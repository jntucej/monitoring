// tests/gate/routes/supervisor-escalations.test.ts
jest.mock('@/middleware/authorization', () => ({
  withAuthorization: (h: any) => h,
}));

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
}));

jest.mock('@/lib/postgres', () => ({ query: jest.fn() }));

import { GET } from '@/app/api/supervisor/escalations/route';
import { query } from '@/lib/postgres';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

const mockQuery = query as jest.Mock;

function req() {
  return new ShimNextRequest('http://x/api/supervisor/escalations', { method: 'GET' }) as any;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/supervisor/escalations', () => {
  it('scopes alerts by supervised_gates when caller is supervisor with assigned gates', async () => {
    // 1st query: permissions
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2nd query: alerts
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'A-1', gate_id: 'G-MAIN', title: 'Test Alert' }] });
    // 3rd query: audit_logs
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await GET(req(), {
      auth: {
        userId: 'SUP-1',
        role: 'supervisor',
        supervisedGates: ['G-MAIN', 'G-NORTH'],
      } as any,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.activeAlerts).toHaveLength(1);

    // Verify 2nd query (alerts) was parameterized with supervisedGates
    const alertQueryCall = mockQuery.mock.calls[1];
    expect(alertQueryCall[0]).toContain('ANY($1::uuid[])');
    expect(alertQueryCall[1]).toEqual([['G-MAIN', 'G-NORTH']]);
  });

  it('queries all alerts campus-wide when caller is admin or supervisor without gate scoping', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await GET(req(), {
      auth: {
        userId: 'ADM-1',
        role: 'admin',
        supervisedGates: null,
      } as any,
    });

    expect(res.status).toBe(200);
    const alertQueryCall = mockQuery.mock.calls[1];
    expect(alertQueryCall[0]).not.toContain('ANY($1::uuid[])');
    expect(alertQueryCall[1]).toEqual([]);
  });
});
