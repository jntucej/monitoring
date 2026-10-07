/**
 * Zustand auth store — holds the Supabase Auth session for the web app.
 * The access token (`token`) is a genuine Supabase JWT issued by
 * /api/auth/login | /api/auth/pin-login; send it as
 * `Authorization: Bearer <token>` on API calls.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useCallback, useSyncExternalStore } from "react";
import type { User, Role } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  authenticated: boolean;
  loading: boolean;
  _hasHydrated: boolean;
}

interface AuthActions {
  login: (
    login: string,
    password: string,
    mfa?: { challenge?: string; totpCode?: string }
  ) => Promise<{
    success: boolean;
    error?: string;
    code?: string;
    mfaRequired?: boolean;
    mfaChallenge?: string;
    mfaEnrollmentRequired?: boolean;
  }>;
  pinLogin: (employeeId: string, pin: string) => Promise<{ success: boolean; error?: string; code?: string }>;
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
      _hasHydrated: false,

      setHasHydrated: (hydrated: boolean) => set({ _hasHydrated: hydrated }),

      login: async (login, password, mfa) => {
        set({ loading: true });
        try {
          // Convert to uppercase for consistency
          const cleanLogin = login.trim().toUpperCase();
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              login: cleanLogin,
              password,
              mfa_challenge: mfa?.challenge,
              totp_code: mfa?.totpCode,
            }),
          });

          const result = await response.json().catch(() => null);

          if (response.ok && result?.success && result.data) {
            const { token, refreshToken, user } = result.data;
            set({
              user,
              token,
              refreshToken: refreshToken ?? null,
              role: user.role as Role,
              authenticated: true,
              loading: false,
            });
            return { success: true };
          }

          // Leg 1 of two-leg MFA login: password ok, TOTP required
          if (response.ok && result?.success && result.mfa_required) {
            set({ loading: false });
            return {
              success: false,
              mfaRequired: true,
              mfaChallenge: result.mfa_challenge,
            };
          }

          // Admin must enroll 2FA first — no session issued
          if (response.ok && result?.success && result.mfa_enrollment_required) {
            set({ loading: false });
            return { success: false, mfaEnrollmentRequired: true };
          }

          set({ loading: false });
          return {
            success: false,
            error: result?.error?.message || "Invalid credentials",
            code: result?.error?.code,
          };
        } catch (error) {
          console.error("Login error:", error);
        }

        set({ loading: false });
        return { success: false, error: "Invalid credentials" };
      },

      pinLogin: async (employeeId, pin) => {
        set({ loading: true });
        try {
          const cleanEmployeeId = employeeId.trim().toUpperCase();
          const response = await fetch("/api/auth/pin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId: cleanEmployeeId, pin }),
          });

          const result = await response.json().catch(() => null);

          if (response.ok && result?.success && result?.data) {
            const { token, refreshToken, user } = result.data;
            set({
              user,
              token,
              refreshToken: refreshToken ?? null,
              role: user.role as Role,
              authenticated: true,
              loading: false,
            });
            return { success: true };
          }

          set({ loading: false });
          return {
            success: false,
            error: result?.error?.message || "Invalid PIN",
            code: result?.error?.code,
          };
        } catch (error) {
          console.error("PIN login error:", error);
        }

        set({ loading: false });
        return { success: false, error: "Invalid PIN" };
      },

      checkSession: async () => {
        const { token, refreshToken, user, authenticated } = get();
        if (!token || !user || !authenticated) return false;

        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
          };
          if (refreshToken) {
            headers["X-Refresh-Token"] = refreshToken;
          }
          if (user.currentSessionToken) {
            headers["X-Session-Token"] = user.currentSessionToken;
          }

          const res = await fetch("/api/auth/session", { method: "GET", headers });
          const result = await res.json().catch(() => null);

          if (res.ok && result?.success && result?.data) {
            const { token: newToken, refreshToken: newRefreshToken, user: updatedUser } = result.data;
            const current = get();
            const userChanged = JSON.stringify(current.user) !== JSON.stringify(updatedUser);
            const tokenChanged = (newToken && newToken !== current.token) || (newRefreshToken && newRefreshToken !== current.refreshToken);

            if (userChanged || tokenChanged || !current.authenticated) {
              set({
                user: updatedUser,
                token: newToken || token,
                refreshToken: newRefreshToken || refreshToken,
                role: updatedUser.role as Role,
                authenticated: true,
              });
            }
            return true;
          } else if (res.status === 401 || res.status === 403) {
            // Session expired or invalid on server
            await get().logout();
            return false;
          }
        } catch (err) {
          console.error("Session revalidation warning:", err);
          // On network error/offline, maintain current session state gracefully
        }
        return true;
      },

      logout: async () => {
        const { token, authenticated } = get();
        if (!token && !authenticated) {
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
          return;
        }

        // Clear auth store state FIRST to prevent concurrent re-triggers
        set({
          user: null,
          token: null,
          refreshToken: null,
          role: null,
          authenticated: false,
          loading: false,
        });

        // Best-effort server-side revocation of the Supabase session.
        if (token) {
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (error) {
            console.error("Logout request error:", error);
          }
        }

        // Reset operator store state
        try {
          const { useOperatorStore } = await import("@/stores/operatorStore");
          useOperatorStore.setState({
            state: "idle",
            currentStudent: null,
            selectedDirection: "IN",
            selectedReason: null,
            photoVerificationDone: false,
            error: null,
            lastScan: null,
            todaysStats: null,
            recentScans: [],
            gate: null,
          });
        } catch (e) {
          console.error("Failed to reset operator store on logout:", e);
        }

        // Reset admin store state
        try {
          const { useAdminStore } = await import("@/stores/adminStore");
          useAdminStore.setState({
            dashboardData: null,
            alerts: [],
            unreadNotifications: 0,
            liveActivity: [],
            activeGate: null,
            loading: false,
          });
        } catch (e) {
          console.error("Failed to reset admin store on logout:", e);
        }

        // Clear storage and hard-redirect to login if not already on login page
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("gate-monitor-token");
            localStorage.removeItem("gate-monitor-auth");
            localStorage.removeItem("gate-monitor-role");
            localStorage.clear();
          } catch (e) {
            console.error("Error clearing storage on logout:", e);
          }
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      },

      setRole: (role) => set({ role }),
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "gate-monitor-auth",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? sessionStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        role: state.role,
        authenticated: state.authenticated,
      }),
    }
  )
);

export function useHasHydrated() {
  // useSyncExternalStore is the canonical way to read external store state —
  // no setState-in-effect, no cascading renders, SSR-safe (renders false on server).
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubFinish = useAuthStore.persist.onFinishHydration(onStoreChange);
      return () => unsubFinish();
    },
    []
  );
  return useSyncExternalStore(subscribe, () => useAuthStore.persist.hasHydrated(), () => false);
}
