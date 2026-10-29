// tests/gate/integration/gate-desk-flow.test.tsx
// Renders the actual scan flow using the REAL operator store + REAL
// ScanConfirmation component, with the network mocked. Simulates:
//   operator lands on the gate page (already logged in) → scans a QR
//   → sees confirmation → confirms Home In → sees SuccessFlash.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/gate/G-MAIN-UUID',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ gateId: 'G-MAIN-UUID' }),
}));

jest.mock('@/stores/authStore', () => {
  const state = {
    user: { id: 'OP', gateId: 'G-MAIN-UUID', name: 'Op', role: 'operator' },
    role: 'operator', authenticated: true, token: 'jwt', _hasHydrated: true,
  };
  return {
    useAuthStore: Object.assign(() => state, { getState: () => state }),
    useHasHydrated: () => true,
    tokenStorage: { get: () => 'jwt' },
  };
});

jest.mock('@/lib/geo', () => ({
  getClientLocation: jest.fn().mockResolvedValue({}),
  getClientSysTag: () => 'jest',
}));

jest.mock('@/context/GlassContext', () => ({
  useGlass: () => ({
    isLiveStream: true, wsConnected: true, isDark: false,
  }),
}));

import { useOperatorStore } from '@/stores/operatorStore';
import { ScanConfirmation } from '@/components/operator/ScanConfirmation';
import { SuccessFlash } from '@/components/operator/SuccessFlash';
import { ScanViewfinder } from '@/components/operator/ScanViewfinder';
import { installFetchMock, route, resetFetchMock } from '../helpers/fetch-mock';
import { TEST_STUDENT } from '../helpers/fixtures';

function GateDeskHarness() {
  const state = useOperatorStore();
  const [flash, setFlash] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state.state === 'success' && state.lastScan) {
      setFlash(`${state.lastScan.direction} recorded`);
    }
  }, [state.state, state.lastScan]);

  return (
    <div>
      {state.state === 'idle' && (
        <ScanViewfinder
          onScanQr={async () => {
            await useOperatorStore.getState().startScan(TEST_STUDENT.uniqueId);
          }}
          onScanBarcode={() => {}}
          onManualEntry={() => {}}
        />
      )}
      {state.state === 'confirming' && state.currentStudent && (
        <ScanConfirmation
          student={state.currentStudent as any}
          onConfirm={async (dir, reason, entryType, buttonId) => {
            await useOperatorStore.getState().confirmScan(
              jest.fn(), dir, reason, entryType, buttonId,
            );
          }}
          onCancel={() => useOperatorStore.getState().cancelScan()}
          campusStatus={state.currentCampusStatus}
          currentEntryType={state.entryType}
        />
      )}
      {state.state === 'success' && flash && (
        <SuccessFlash onClick={() => useOperatorStore.getState().reset()}>
          {flash}
        </SuccessFlash>
      )}
      {state.state === 'error' && (
        <div role="alert">{state.error?.message ?? 'Scan failed'}</div>
      )}
    </div>
  );
}

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

describe('Gate desk — full operator flow', () => {
  it('scan a QR → confirm Home In → success flash', async () => {
    route('GET', `/api/persons/${TEST_STUDENT.uniqueId}`, () => ({
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
    route('GET', `/api/operator/lookup?id=${TEST_STUDENT.uniqueId}`, () => ({
      status: 200,
      body: { success: true, data: { found: true, person: TEST_STUDENT } },
    }));

    route('POST', '/api/gate/scan', () => ({
      status: 200,
      body: {
        success: true,
        data: {
          scan: {
            id: 'S-1', user_id: 'STU-1', direction: 'IN',
            timestamp: new Date().toISOString(),
          },
          isDuplicate: false,
          person: TEST_STUDENT,
        },
      },
    }));
    route('POST', '/api/operator/entry-type', () => ({ status: 200, body: { success: true } }));

    render(<GateDeskHarness />);

    expect(screen.getByRole('button', { name: /scan qr/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /scan qr/i }));

    await waitFor(() => {
      expect(screen.queryByText(/ravi kumar/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait 2.2s for photo verification countdown
    await new Promise((r) => setTimeout(r, 2200));

    const homeIn = screen.getByRole('button', { name: /home in|entry/i });
    fireEvent.click(homeIn);

    await waitFor(() => {
      expect(screen.getByText(/in recorded/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(useOperatorStore.getState().state).toBe('success');
  });

  it('scan a duplicate → error state, no success flash', async () => {
    route('GET', `/api/persons/${TEST_STUDENT.uniqueId}`, () => ({
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
    route('GET', `/api/operator/lookup?id=${TEST_STUDENT.uniqueId}`, () => ({
      status: 200,
      body: { success: true, data: { found: true, person: TEST_STUDENT } },
    }));

    // Scan returns 409 duplicate
    route('POST', '/api/gate/scan', () => ({
      status: 409,
      body: { success: false, error: { code: 'DUPLICATE', message: 'Already scanned' } },
    }));

    render(<GateDeskHarness />);
    fireEvent.click(screen.getByRole('button', { name: /scan qr/i }));

    await waitFor(() => {
      expect(screen.queryByText(/ravi kumar/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait 2.2s for photo verification countdown
    await new Promise((r) => setTimeout(r, 2200));

    const confirmBtn = screen.getByRole('button', { name: /home in|entry/i });
    fireEvent.click(confirmBtn);

    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByText(/in recorded/i)).toBeNull();

    const alert = screen.queryByRole('alert');
    expect(alert !== null || screen.queryByText(/already|duplicate/i) !== null).toBe(true);
  });
});
