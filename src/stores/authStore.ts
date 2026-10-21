import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useCallback, useSyncExternalStore } from "react";
import type { User, Role } from "@/lib/types";

function toUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    email: raw.email,
    phone: raw.phone ?? undefined,
    uniqueId: raw.uniqueId ?? raw.unique_id ?? undefined,
    departmentId: raw.departmentId ?? raw.department_id ?? undefined,
    photoUrl: raw.photoUrl ?? raw.photo_url ?? undefined,
    status: raw.status ?? "ACTIVE",
    studentDetails: raw.studentDetails ?? raw.student_details ?? undefined,
    employeeDetails: raw.employeeDetails ?? raw.employee_details ?? undefined,
  } as User;
}

export const tokenStorage = {
  get: () => ({
    token: typeof window !== "undefined" ? sessionStorage.getItem("auth.token") : null,
    refreshToken: typeof window !== "undefined" ? sessionStorage.getItem("auth.refresh") : null,
  }),
  set: (t: { token: string | null; refreshToken: string | null }) => {
    if (typeof window === "undefined") return;
    if (t.token) sessionStorage.setItem("auth.token", t.token);
    else sessionStorage.removeItem("auth.token");
    if (t.refreshToken) sessionStorage.setItem("auth.refresh", t.refreshToken);
    else sessionStorage.removeItem("auth.refresh");
  },
  clear: () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("auth.token");
    sessionStorage.removeItem("auth.refresh");
  },
};

interface MfaChallenge {
  id: string;
  expiresAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  authenticated: boolean;
  loading: boolean;
  mfaChallenge?: MfaChallenge | null;
  mfaPending?: boolean;
  enrollToken?: string | null;
  _hasHydrated: boolean;
}

interface LoginResult {
  success: boolean;
  error?: string;
  code?: string;
  mfaRequired?: boolean;
  mfaChallenge?: MfaChallenge;
  mfaEnrollmentRequired?: boolean;
  enrollToken?: string;
}

interface AuthActions {
  login: (
    login: string,
    password: string,
    mfa?: { challenge?: MfaChallenge; totpCode?: string }
  ) => Promise<LoginResult>;
  pinLogin: (
    employeeId: string,
    pin: string,
    mfa?: { challenge?: MfaChallenge; totpCode?: string }
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  setRole: (role: Role) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      authenticated: false,
      loading: false,
      mfaChallenge: null,
      mfaPending: false,
      enrollToken: null,
      _hasHydrated: false,
      login: async (loginIdentifier, password, mfa) => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: loginIdentifier.toUpperCase(), password, mfa }),
          });
          const body = await res.json();
          if (!body.success) {
            set({ loading: false });
            return { success: false, error: body.error?.message, code: body.error?.code };
          }
          const d = body.data ?? {};
          // The /api/auth/login route returns data.token / data.refreshToken
          // (and data.mfa_challenge / data.mfa_enrollment_required in snake
          // case). Normalise both snake_case and camelCase here so the
          // login never silently drops the token just because the field
          // name doesn't match.
          const mfaRequired = Boolean(d.mfaRequired || d.mfa_required);
          const mfaEnrollRequired = Boolean(d.mfaEnrollmentRequired || d.mfa_enrollment_required);
          const mfaChallenge = d.mfaChallenge ?? d.mfa_challenge;
          const enrollToken = d.enrollToken ?? d.enroll_token;
          const token = d.token ?? d.accessToken;
          const refreshToken = d.refreshToken ?? d.refresh_token;
          if (mfaRequired) {
            set({ loading: false, mfaPending: true, mfaChallenge });
            return { success: true, mfaRequired: true, mfaChallenge };
          }
          if (mfaEnrollRequired) {
            set({ loading: false, enrollToken });
            return { success: true, mfaEnrollmentRequired: true, enrollToken };
          }
          if (!token) {
            // Server said success:true but gave no token — treat as a failure
            // rather than setting the auth store to a null token (which is
            // what produced the "logged in but redirected to /login" loop).
            set({ loading: false });
            return { success: false, code: "NO_TOKEN", error: "Login succeeded but no token was returned." };
          }
          tokenStorage.set({ token, refreshToken: refreshToken ?? null });
          set({
            token,
            refreshToken,
            user: toUser(d.user),
            role: d.user?.role,
            authenticated: true,
            loading: false,
            mfaPending: false,
            mfaChallenge: null,
          });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err instanceof Error ? err.message : "Network error" };
        }
      },
      pinLogin: async (employeeId, pin, mfa) => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/pin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId, pin, mfa }),
          });
          const body = await res.json();
          if (!body.success) {
            set({ loading: false });
            return { success: false, error: body.error?.message, code: body.error?.code };
          }
          const d = body.data ?? {};
          if (d.mustChangePin) {
            set({ loading: false });
            return { success: false, code: "PIN_MUST_CHANGE", error: "PIN rotation required" };
          }
          if (d.mfaRequired) {
            set({ loading: false, mfaPending: true, mfaChallenge: d.mfaChallenge });
            return { success: true, mfaRequired: true, mfaChallenge: d.mfaChallenge };
          }
          if (d.mfaEnrollmentRequired) {
            set({ loading: false, enrollToken: d.enrollToken });
            return { success: true, mfaEnrollmentRequired: true, enrollToken: d.enrollToken };
          }
          tokenStorage.set({ token: d.accessToken, refreshToken: d.refreshToken });
          set({
            token: d.accessToken,
            refreshToken: d.refreshToken,
            user: toUser(d.user),
            role: d.user.role,
            authenticated: true,
            loading: false,
            mfaPending: false,
            mfaChallenge: null,
          });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          return { success: false, error: err instanceof Error ? err.message : "Network error" };
        }
      },
      logout: async () => {
        const token = get().token;
        tokenStorage.clear();
        set({
          token: null,
          refreshToken: null,
          user: null,
          role: null,
          authenticated: false,
          mfaPending: false,
          mfaChallenge: null,
          enrollToken: null,
        });
        if (token) {
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {
            /* server-side logout is best-effort */
          }
        }
      },
      checkSession: async () => {
        const token = get().token || tokenStorage.get().token;
        if (!token) {
          set({ authenticated: false, user: null, role: null });
          return false;
        }
        try {
          const res = await fetch("/api/auth/session", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const body = await res.json();
          if (!body.success || !body.data?.user) {
            tokenStorage.clear();
            set({ authenticated: false, user: null, role: null, token: null, refreshToken: null });
            return false;
          }
          set({
            token,
            refreshToken: get().refreshToken ?? tokenStorage.get().refreshToken,
            user: toUser(body.data.user),
            role: body.data.user.role,
            authenticated: true,
          });
          return true;
        } catch {
          return false;
        }
      },
      setRole: (role) => set({ role }),
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: "mycampus-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        user: s.user,
        role: s.role,
        authenticated: s.authenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const t = tokenStorage.get();
          state.token = t.token;
          state.refreshToken = t.refreshToken;
          state.authenticated = Boolean(t.token && state.authenticated);
          // Flip the hydrated flag via the store action so Zustand subscribers
          // (useHasHydrated) are notified immediately. A direct field write
          // would not trigger subscribers and could leave a guarded route on
          // the AppLoadingScreen for its first paint.
          state.setHasHydrated(true);
        }
      },
    }
  )
);

export function useHasHydrated() {
  return useSyncExternalStore(
    (cb) => useAuthStore.subscribe(cb),
    () => useAuthStore.getState()._hasHydrated,
    () => false
  );
}
