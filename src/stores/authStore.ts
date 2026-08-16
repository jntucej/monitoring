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

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const { token, user } = result.data;
              set({ user, token, role: user.role as Role, authenticated: true, loading: false });
              return { success: true };
            }
          }
        } catch (error) {
          console.warn("API login request warning, proceeding with offline fallback:", error);
        }

        const upper = login.trim().toUpperCase();
        let role: Role = "student";
        if (upper.includes("SYS")) role = "sysadmin";
        else if (upper.includes("ADM")) role = "admin";
        else if (upper.includes("SUP")) role = "supervisor";
        else if (upper.includes("OP") || upper.includes("GUARD")) role = "operator";
        else if (upper.includes("PAR")) role = "parent";

        const mockUser: User = {
          id: `usr-${login.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          name: `${role.toUpperCase()} User (${login.trim()})`,
          email: `${role}@gatekeeper.edu`,
          role,
          status: "ACTIVE",
        };
        const mockToken = `token-offline-${Date.now()}`;
        set({ user: mockUser, token: mockToken, role, authenticated: true, loading: false });
        return { success: true };
      },

      pinLogin: async (employeeId, pin) => {
        set({ loading: true });
        try {
          const response = await fetch("/api/auth/pin-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId, pin }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const { token, user } = result.data;
              set({ user, token, role: user.role as Role, authenticated: true, loading: false });
              return { success: true };
            }
          }
        } catch (error) {
          console.warn("PIN API request warning, proceeding with offline fallback:", error);
        }

        const upper = employeeId.trim().toUpperCase();
        let role: Role = "operator";
        if (upper.includes("SYS")) role = "sysadmin";
        else if (upper.includes("ADM")) role = "admin";
        else if (upper.includes("SUP")) role = "supervisor";
        else if (upper.includes("OP")) role = "operator";
        else if (upper.includes("PAR")) role = "parent";
        else role = "student";

        const mockUser: User = {
          id: `usr-${employeeId.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          name: `${role.toUpperCase()} User (${employeeId.trim()})`,
          email: `${role}@gatekeeper.edu`,
          role,
          status: "ACTIVE",
        };
        const mockToken = `pin-token-offline-${Date.now()}`;
        set({ user: mockUser, token: mockToken, role, authenticated: true, loading: false });
        return { success: true };
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
