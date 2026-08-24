/**
 * Zustand auth store — holds the Supabase Auth session for the web app.
 * The access token (`token`) is a genuine Supabase JWT issued by
 * /api/auth/login | /api/auth/pin-login; send it as
 * `Authorization: Bearer <token>` on API calls.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/types";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: Role | null;
  authenticated: boolean;
  loading: boolean;
}

interface AuthActions {
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  pinLogin: (employeeId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
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

      login: async (login, password) => {
        set({ loading: true });
        try {
          // Convert to uppercase for consistency
          const cleanLogin = login.trim().toUpperCase();
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: cleanLogin, password }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
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
          }
        } catch (error) {
          console.error("Login error:", error);
        }

        set({ loading: false });
        return { success: false, error: "Invalid credentials" };
      },

      pinLogin: async (employeeId, pin) => {
        set({ loading: true });
        try {
          // Convert to uppercase for consistency
          const cleanEmployeeId = employeeId.trim().toUpperCase();
          const response = await fetch("/api/auth/pin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId: cleanEmployeeId, pin }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
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
          }
        } catch (error) {
          console.error("PIN login error:", error);
        }

        set({ loading: false });
        return { success: false, error: "Invalid PIN" };
      },

      logout: async () => {
        // Best-effort server-side revocation of the Supabase session.
        const token = get().token;
        try {
          if (token) {
            await fetch("/api/auth/logout", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch (error) {
          console.error("Logout request error:", error);
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

        // Clear auth store state
        set({
          user: null,
          token: null,
          refreshToken: null,
          role: null,
          authenticated: false,
          loading: false,
        });

        // Clear storage and hard-redirect to login
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("gate-monitor-token");
            localStorage.removeItem("gate-monitor-auth");
            localStorage.removeItem("gate-monitor-role");
            sessionStorage.clear();
          } catch (e) {
            console.error("Error clearing storage on logout:", e);
          }
          window.location.href = "/login";
        }
      },

      setRole: (role) => set({ role }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "gate-monitor-auth",
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
