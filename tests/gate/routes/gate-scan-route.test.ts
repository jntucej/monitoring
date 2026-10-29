// tests/gate/routes/gate-scan-route.test.ts
jest.mock('@/middleware/authorization', () => ({
  withAuthorization: (h: any) => h, // pass through; the handler itself is tested
}));

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
  rateLimitByKey: jest.fn().mockResolvedValue({ limited: false }),
}));

jest.mock('@/lib/csrf', () => ({ assertCsrf: () => null }));
jest.mock('@/server/services/scan/record');
jest.mock('@/lib/postgres', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ gate_id: 'G-1' }] }),
}));

import { POST } from '@/app/api/gate/scan/route';
import { recordScan } from '@/server/services/scan/record';
import { BadRequestError, ForbiddenError, LockedError } from '@/server/http/errors';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

const mockRecordScan = recordScan as jest.Mock;
const auth = { userId: 'OP', role: 'operator', gateId: 'G-1', name: 'Op' };

function call(body: unknown, authOverride = auth) {
  const req = new ShimNextRequest('http://x/api/gate/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': 'OP' },
    body: JSON.stringify(body),
  });
  return POST(req as any, { auth: authOverride as any });
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/gate/scan', () => {
  it('rejects an empty body with 400', async () => {
    const res = await call({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('rejects when direction is missing', async () => {
    const res = await call({ roll: '24JJ1A0501' });
    expect(res.status).toBe(400);
  });

  it('rejects when gateId is missing and operator has no bound gate', async () => {
    const unassignedAuth = { userId: 'OP2', role: 'operator', gateId: null };
    const { query } = require('@/lib/postgres');
    query.mockResolvedValueOnce({ rows: [] }); // DB returns no gate_id
    const res = await call({ roll: '24JJ1A0501', direction: 'IN' }, unassignedAuth as any);
    expect(res.status).toBe(400);
  });

  it('returns ok({ scan, person, isDuplicate }) on success', async () => {
    mockRecordScan.mockResolvedValueOnce({
      log: { id: 'S-1', user_id: 'U-1', direction: 'IN' },
      isDuplicate: false,
      consumedPassId: null,
      person: { id: 'U-1', uniqueId: '24JJ1A0501', name: 'S', role: 'student', status: 'ACTIVE', photoUrl: null },
    });
    const res = await call({
      roll: '24JJ1A0501', direction: 'IN', entryType: 'hosteller', gateId: 'G-1',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.scan.id).toBe('S-1');
    expect(mockRecordScan).toHaveBeenCalledWith(expect.objectContaining({
      roll: '24JJ1A0501',
      direction: 'IN',
      entryType: 'hosteller',
      operatorId: 'OP',
      operatorGateId: 'G-1',
    }));
  });

  it('maps LockedError to HTTP 423', async () => {
    mockRecordScan.mockRejectedValueOnce(new LockedError('locked'));
    const res = await call({ roll: '24JJ1A0501', direction: 'IN', entryType: 'hosteller', gateId: 'G-1' });
    expect(res.status).toBe(423);
  });

  it('maps ForbiddenError to 403', async () => {
    mockRecordScan.mockRejectedValueOnce(new ForbiddenError('nope'));
    const res = await call({ roll: '24JJ1A0501', direction: 'IN', entryType: 'hosteller', gateId: 'G-1' });
    expect(res.status).toBe(403);
  });
});
