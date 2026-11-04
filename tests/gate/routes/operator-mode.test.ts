// tests/gate/routes/operator-mode.test.ts
jest.mock('@/middleware/authorization', () => ({
  withAuthorization: (h: any) => h,
}));

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (h: any) => h,
  checkRateLimit: async () => ({ limited: false }),
}));

// withMutationGuard also enforces the trusted-header signature + CSRF,
// both real crypto checks — exempt both so these route-logic tests reach
// the handler with a plain request.
jest.mock('@/server/http/trusted-headers', () => ({
  requireTrustedHeaders: () => null,
}));
jest.mock('@/lib/csrf', () => ({
  assertCsrf: () => null,
}));
// requiresStepUp: true on the mode route runs assertFreshStepUp, a real
// DB query — bypass it so route-logic tests don't need a live Postgres.
jest.mock('@/lib/step-up', () => ({
  assertFreshStepUp: jest.fn(async () => {}),
  performStepUp: jest.fn(),
}));

jest.mock('@/lib/gate-operations', () => ({
  getGateMode: jest.fn(),
  setGateMode: jest.fn(),
}));

import { GET, POST } from '@/app/api/operator/mode/route';
import { getGateMode, setGateMode } from '@/lib/gate-operations';
import { NextRequest as ShimNextRequest } from '../helpers/next-server';

const mockGetGateMode = getGateMode as jest.Mock;
const mockSetGateMode = setGateMode as jest.Mock;

function postReq(body: any) {
  return new ShimNextRequest('http://x/api/operator/mode', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any;
}

beforeEach(() => jest.clearAllMocks());

describe('/api/operator/mode', () => {
  it('GET returns current mode', async () => {
    mockGetGateMode.mockResolvedValueOnce('CURFEW');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.mode).toBe('CURFEW');
  });

  it('POST rejects invalid mode with 400', async () => {
    const res = await POST(postReq({ mode: 'INVALID_MODE' }), {
      auth: { userId: 'ADM-1', role: 'admin' } as any,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_MODE');
  });

  it('POST sets valid mode (MAINTENANCE)', async () => {
    mockSetGateMode.mockResolvedValueOnce(undefined);
    const res = await POST(postReq({ mode: 'MAINTENANCE', reason: 'Gate repair' }), {
      auth: { userId: 'ADM-1', role: 'admin' } as any,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.mode).toBe('MAINTENANCE');
    expect(mockSetGateMode).toHaveBeenCalledWith('MAINTENANCE', 'ADM-1', 'Gate repair');
  });
});
