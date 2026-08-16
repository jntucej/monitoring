/**
 * Zustand auth store — manages JWT token, user info, and role in localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/types";
import { invalidateSession } from "@/lib/db";

interface AuthState {
  user: User | null;
  token: string | null;
  role: Role | null;
  authenticated: boolean;
  loading: boolean;
}

interface AuthActions {
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  pinLogin: (employeeId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      authenticated: false,
      loading: false,

      login: async (login, password) => {
        set({ loading: true });
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            set({ loading: false });
            return { success: false, error: result.error?.message || "Login failed" };
          }

          const { token, user } = result.data;
          set({ user, token, role: user.role as Role, authenticated: true, loading: false });
          return { success: true };
        } catch (error) {
          set({ loading: false });
          return { success: false, error: "Network error" };
        }
      },

      pinLogin: async (employeeId, pin) => {
        set({ loading: true });
        try {
          const response = await fetch("/api/auth/pin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId, pin }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            set({ loading: false });
            return { success: false, error: result.error?.message || "PIN login failed" };
          }

          const { token, user } = result.data;
          set({ user, token, role: user.role as Role, authenticated: true, loading: false });
          return { success: true };
        } catch (error) {
          set({ loading: false });
          return { success: false, error: "Network error" };
        }
      },

      logout: async () => {
        const token = get().token;
        if (token) await invalidateSession(token);
        localStorage.removeItem("gate-monitor-token");
        localStorage.removeItem("gate-monitor-auth");
        set({ user: null, token: null, role: null, authenticated: false });
        window.location.href = "/";
      },

      setRole: (role) => set({ role }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "gate-monitor-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        authenticated: state.authenticated,
      }),
    }
  )
);
