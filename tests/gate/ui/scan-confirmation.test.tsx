// tests/gate/ui/scan-confirmation.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockAuthState = {
  user: { id: 'OP', role: 'operator', name: 'Op' },
  role: 'operator',
  authenticated: true,
  token: 'jwt-token',
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (sel?: any) => (sel ? sel(mockAuthState) : mockAuthState),
    { getState: () => mockAuthState }
  ),
  useHasHydrated: () => true,
}));

jest.mock('@/stores/operatorStore', () => ({
  useOperatorStore: () => ({
    todaysStats: { entries: 10, exits: 8, onCampus: 2 },
    getRecommendation: jest.fn().mockReturnValue({
      direction: 'IN',
      reason: null,
      entryType: 'hosteller',
      entryButton: 'home_in',
      confidence: 0.9,
      alternatives: [
        { code: 'day_scholar_in', label: 'Outing In', icon: 'ArrowUp',
          direction: 'IN', payload: { direction: 'IN', entryType: 'day_scholar', buttonId: 'day_scholar_in' } },
      ],
    }),
  }),
}));

import { ScanConfirmation } from '@/components/operator/ScanConfirmation';
import { TEST_STUDENT } from '../helpers/fixtures';

describe('<ScanConfirmation> — operator confirmation card', () => {
  const onConfirm = jest.fn();
  const onCancel  = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
  });

  function renderConfirmation(overrides: Partial<React.ComponentProps<typeof ScanConfirmation>> = {}) {
    return render(
      <ScanConfirmation
        student={TEST_STUDENT as any}
        onConfirm={onConfirm}
        onCancel={onCancel}
        campusStatus="OUT"
        currentEntryType="hosteller"
        {...overrides}
      />,
    );
  }

  it('shows the student name + roll', () => {
    renderConfirmation();
    expect(screen.getByText(/ravi kumar/i)).toBeInTheDocument();
    expect(screen.getAllByText(/24JJ1A0501/i).length).toBeGreaterThan(0);
  });

  it('shows a single recommended button + alternatives', () => {
    renderConfirmation();
    const recBtn = screen.getByRole('button', { name: /home in|entry|confirm/i });
    expect(recBtn).toBeInTheDocument();
    const altButtons = screen.getAllByRole('button', { name: /outing in|alt/i });
    expect(altButtons.length).toBeLessThanOrEqual(2);
  });

  it('calls onConfirm with direction IN after 2s verification countdown', async () => {
    renderConfirmation();

    // Wait 2.2 seconds for photo verification countdown to expire
    await new Promise((r) => setTimeout(r, 2200));

    const confirmBtn = screen.getByRole('button', { name: /home in|entry|confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    const [direction, reason, entryType, buttonId] = onConfirm.mock.calls[0];
    expect(direction).toBe('IN');
    expect(reason).toBeUndefined();
    expect(entryType).toBe('hosteller');
    expect(buttonId).toBe('home_in');
  });

  it('calls onCancel when the cancel button is clicked', () => {
    renderConfirmation();
    const cancelBtn = screen.getByRole('button', { name: /cancel & resume scanning/i });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows a "Day Scholar" badge when entryType is day_scholar', () => {
    renderConfirmation({ currentEntryType: 'day_scholar' });
    expect(screen.getAllByText(/day scholar/i).length).toBeGreaterThan(0);
  });

  it('shows a "Hosteller" badge when entryType is hosteller', () => {
    renderConfirmation({ currentEntryType: 'hosteller' });
    expect(screen.getAllByText(/hosteller/i).length).toBeGreaterThan(0);
  });
});
