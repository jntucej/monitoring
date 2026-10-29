// tests/gate/auth/auth-guard.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/stores/authStore', () => {
  const store = {
    user: null as any,
    role: null as any,
    authenticated: false,
    _hasHydrated: true,
    checkSession: jest.fn().mockResolvedValue(false),
  };
  const useAuthStore: any = (sel?: any) =>
    sel ? sel(store) : store;
  useAuthStore.getState = () => store;
  useAuthStore._set = (patch: any) => Object.assign(store, patch);
  return { useAuthStore, useHasHydrated: () => store._hasHydrated };
});

import { AuthGuard } from '@/components/shared/AuthGuard';
import { useAuthStore } from '@/stores/authStore';
import { mockReplace, mockPathname } from '../helpers/next-navigation';

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as any)._set({
    user: null, role: null, authenticated: false,
    _hasHydrated: true, checkSession: jest.fn().mockResolvedValue(false),
  });
});

describe('<AuthGuard> — protects the gate route', () => {
  it('shows a loading screen while the auth store is still hydrating', () => {
    (useAuthStore as any)._set({ _hasHydrated: false });
    render(<AuthGuard allowedRoles={['operator']}><div>gate</div></AuthGuard>);
    expect(screen.queryByText('gate')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', async () => {
    (mockPathname as any).current = '/gate/G-MAIN-UUID';
    render(<AuthGuard allowedRoles={['operator']}><div>gate</div></AuthGuard>);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
    expect(mockReplace.mock.calls[0][0]).toMatch(/^\/login/);
    expect(screen.queryByText('gate')).not.toBeInTheDocument();
  });

  it('renders children when the role matches', async () => {
    (useAuthStore as any)._set({
      user: { id: 'OP', role: 'operator', name: 'Op' },
      role: 'operator', authenticated: true, _hasHydrated: true,
    });
    render(<AuthGuard allowedRoles={['operator']}><div>gate</div></AuthGuard>);
    expect(await screen.findByText('gate')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects a wrong role to default route for that role', async () => {
    (useAuthStore as any)._set({
      user: { id: 'S', role: 'student', name: 'S' },
      role: 'student', authenticated: true, _hasHydrated: true,
    });
    render(<AuthGuard allowedRoles={['operator']}><div>gate</div></AuthGuard>);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
    expect(mockReplace.mock.calls[0][0]).toBe('/student');
  });

  it('does NOT loop forever when the session is stale (3-strike guard)', async () => {
    (useAuthStore as any)._set({
      user: { id: 'OP', role: 'operator', name: 'Op' },
      role: 'operator', authenticated: true, _hasHydrated: true,
      checkSession: jest.fn().mockResolvedValue(false),
    });
    render(<AuthGuard allowedRoles={['operator']}><div>gate</div></AuthGuard>);
    await new Promise((r) => setTimeout(r, 100));
    expect(mockReplace.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
