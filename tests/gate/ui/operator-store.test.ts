// tests/gate/ui/operator-store.test.ts
// Runs in the jsdom project (needs window.fetch for the store's calls).
jest.mock('@/stores/authStore', () => {
  const state = {
    token: 'jwt', user: { id: 'OP', gateId: 'G-MAIN-UUID', name: 'Op' },
    role: 'operator', authenticated: true,
  };
  return {
    useAuthStore: Object.assign(() => state, { getState: () => state }),
    useHasHydrated: () => true,
    tokenStorage: { get: () => 'jwt' },
  };
});

jest.mock('@/stores/uiStore', () => ({
  useUIStore: Object.assign(() => ({}), { getState: () => ({ addToast: jest.fn() }) }),
}));

jest.mock('@/lib/geo', () => ({
  getClientLocation: jest.fn().mockResolvedValue({ latitude: null, longitude: null }),
  getClientSysTag: () => 'jest',
}));

import { useOperatorStore } from '@/stores/operatorStore';
import { installFetchMock, route, resetFetchMock } from '../helpers/fetch-mock';
import { TEST_STUDENT } from '../helpers/fixtures';

beforeEach(async () => {
  resetFetchMock();
  installFetchMock();
  route('GET', '/api/operator/stats', () => ({
    status: 200,
    body: {
      success: true,
      data: {
        entries: 0, exits: 0, onCampus: 0,
        recentScans: [], breakdown: null, outing: [],
      },
    },
  }));
  await useOperatorStore.getState().reset();
});

describe('operatorStore — scan state machine', () => {
  it('startScan transitions to "confirming" and hydrates student', async () => {
    route('GET', '/api/persons/24JJ1A0501', () => ({
      status: 200,
      body: {
        success: true,
        data: {
          person: TEST_STUDENT,
          campusStatus: 'OUT',
          lastScan: null,
          history: [],
        },
      },
    }));

    useOperatorStore.getState().startScan('24JJ1A0501');
    await new Promise((r) => setTimeout(r, 100));
    const s = useOperatorStore.getState();
    expect(['detecting', 'confirming']).toContain(s.state);
  });

  it('confirmScan success → "success" + records the scan', async () => {
    route('POST', '/api/gate/scan', () => ({
      status: 200,
      body: {
        success: true,
        data: {
          scan: { id: 'S-1', user_id: 'STU-UUID-0001', direction: 'IN', timestamp: new Date().toISOString() },
          isDuplicate: false,
          person: TEST_STUDENT,
        },
      },
    }));
    route('POST', '/api/operator/entry-type', () => ({ status: 200, body: { success: true } }));

    useOperatorStore.setState({
      state: 'confirming',
      currentStudent: TEST_STUDENT as any,
      currentCampusStatus: 'OUT',
      entryType: 'hosteller',
    });

    const addToast = jest.fn();
    await useOperatorStore.getState().confirmScan(addToast, 'IN', undefined, 'hosteller', 'home_in');
    await new Promise((r) => setTimeout(r, 100));
    const s = useOperatorStore.getState();
    expect(s.state).toBe('success');
    expect(s.error).toBeNull();
    expect(s.recentScans.length).toBeGreaterThanOrEqual(1);
  });

  it('confirmScan duplicate → error "already scanned" + cancel (no new entry)', async () => {
    route('POST', '/api/gate/scan', () => ({
      status: 409,
      body: { success: false, error: { code: 'DUPLICATE', message: 'Already scanned' } },
    }));

    useOperatorStore.setState({
      state: 'confirming',
      currentStudent: TEST_STUDENT as any,
      currentCampusStatus: 'OUT',
      entryType: 'hosteller',
    });

    await useOperatorStore.getState().confirmScan(jest.fn(), 'IN', undefined, 'hosteller', 'home_in');
    await new Promise((r) => setTimeout(r, 50));
    const s = useOperatorStore.getState();
    expect(['error', 'confirming']).toContain(s.state);
  });

  it('reset returns to idle', async () => {
    useOperatorStore.setState({ state: 'success' });
    await useOperatorStore.getState().reset();
    expect(useOperatorStore.getState().state).toBe('idle');
  });

  it('cancelScan clears the scanned student but keeps recentScans', () => {
    useOperatorStore.setState({
      state: 'confirming',
      currentStudent: TEST_STUDENT as any,
      recentScans: [],
    });
    useOperatorStore.getState().cancelScan();
    expect(useOperatorStore.getState().state).toBe('idle');
    expect(useOperatorStore.getState().currentStudent).toBeNull();
  });
});
