/**
 * Zustand auth store — manages JWT token, user info, and role in localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/types";
import { signToken } from "@/lib/auth";
import { findUserByLogin, verifyLogin, verifyPin, createSession, invalidateSession } from "@/lib/db";

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
        const user = verifyLogin(login, password);
        if (!user) {
          set({ loading: false });
          return { success: false, error: "Invalid credentials" };
        }
        const token = await signToken(user);
        createSession(user.id, token, token + "-refresh");
        set({ user, token, role: user.role as Role, authenticated: true, loading: false });
        return { success: true };
      },

      pinLogin: async (employeeId, pin) => {
        set({ loading: true });
        const user = findUserByLogin(employeeId);
        if (!user || user.role !== "operator") {
          set({ loading: false });
          return { success: false, error: "User not found" };
        }
        if (!user.pin || !verifyPin(user.id, pin)) {
          set({ loading: false });
          return { success: false, error: "Invalid PIN" };
        }
        const token = await signToken(user);
        createSession(user.id, token, token + "-refresh");
        set({ user, token, role: "operator", authenticated: true, loading: false });
        return { success: true };
      },

      logout: () => {
        const token = get().token;
        if (token) invalidateSession(token);
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
