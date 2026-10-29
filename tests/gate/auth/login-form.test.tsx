// tests/gate/auth/login-form.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockAuthState = {
  login: jest.fn(),
  loading: false,
  user: null,
  role: null,
  authenticated: false,
  _hasHydrated: true,
  checkSession: jest.fn().mockResolvedValue(false),
};

jest.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (sel?: any) => (sel ? sel(mockAuthState) : mockAuthState),
    {
      getState: () => mockAuthState,
    }
  ),
  useHasHydrated: () => true,
}));

import { LoginForm } from '@/components/shared/LoginForm';
import { mockReplace, mockSearchParams } from '../helpers/next-navigation';

function submitForm(login: string, password: string) {
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText(/username \/ roll number/i), {
    target: { value: login },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: password },
  });
  return user.click(screen.getByRole('button', { name: /sign in|log in|login/i }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState = {
    login: jest.fn(),
    loading: false,
    user: null,
    role: null,
    authenticated: false,
    _hasHydrated: true,
    checkSession: jest.fn().mockResolvedValue(false),
  };
});

describe('<LoginForm> — operator gate-end sign-in', () => {
  it('renders identifier + password + submit', () => {
    render(<LoginForm title="Sign in" subtitle="Access your desk" />);
    expect(screen.getByLabelText(/username \/ roll number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|log in|login/i })).toBeInTheDocument();
  });

  it('shows an error message when the store rejects the credentials', async () => {
    mockAuthState.login.mockResolvedValueOnce({
      success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS',
    });
    render(<LoginForm title="Sign in" subtitle="x" />);
    await submitForm('OPERATOR', 'wrong');
    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to the operator gate route on success', async () => {
    mockAuthState.login.mockImplementationOnce(async () => {
      mockAuthState.role = 'operator' as any;
      mockAuthState.authenticated = true;
      return { success: true, role: 'operator' };
    });
    render(<LoginForm title="Sign in" subtitle="x" />);
    await submitForm('OPERATOR', 'correct');
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
    const target = mockReplace.mock.calls[0][0];
    expect(target).toMatch(/^\/(gate|operator)/);
  });

  it('respects ?redirect= when the target is a safe internal path', async () => {
    mockAuthState.login.mockImplementationOnce(async () => {
      mockAuthState.role = 'operator' as any;
      mockAuthState.authenticated = true;
      return { success: true, role: 'operator' };
    });
    (mockSearchParams as any).get = (k: string) =>
      k === 'redirect' ? '/gate/G-MAIN-UUID' : null;
    render(<LoginForm title="Sign in" subtitle="x" />);
    await submitForm('OPERATOR', 'correct');
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/gate/G-MAIN-UUID');
    });
  });

  it('does NOT redirect to an external / javascript: URL', async () => {
    mockAuthState.login.mockImplementationOnce(async () => {
      mockAuthState.role = 'operator' as any;
      mockAuthState.authenticated = true;
      return { success: true, role: 'operator' };
    });
    (mockSearchParams as any).get = (k: string) =>
      k === 'redirect' ? 'https://evil.example/' : null;
    render(<LoginForm title="Sign in" subtitle="x" />);
    await submitForm('OPERATOR', 'correct');
    await waitFor(() => {
      const target = mockReplace.mock.calls[0]?.[0];
      expect(String(target)).not.toContain('evil.example');
    });
  });

  it('disables the button while submitting (no double submit)', async () => {
    let resolve: (v: any) => void = () => {};
    mockAuthState.login.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    render(<LoginForm title="Sign in" subtitle="x" />);
    fireEvent.change(screen.getByLabelText(/username \/ roll number/i), {
      target: { value: 'OPERATOR' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in|log in|login/i }));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /sign|log|loading/i }) as HTMLButtonElement;
      expect(btn.disabled || /loading/i.test(btn.textContent ?? '')).toBe(true);
    });
    resolve({ success: true, role: 'operator' });
  });
});
