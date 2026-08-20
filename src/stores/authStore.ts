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
  autoLoginAsRole: (targetRole: Role) => { user: User; token: string };
  logout: () => void;
  setRole: (role: Role) => void;
  setLoading: (loading: boolean) => void;
}

export const DEMO_USERS_BY_ROLE: Record<string, User> = {
  operator: {
    id: "op-1",
    name: "R. Kumar (Main Gate Guard)",
    email: "operator@gatekeeper.edu",
    role: "operator",
    gateId: "1",
    employeeId: "OP001",
    status: "ACTIVE",
  },
  supervisor: {
    id: "sup-1",
    name: "Dr. A. Sharma (Chief Supervisor)",
    email: "supervisor@gatekeeper.edu",
    role: "supervisor",
    employeeId: "SUP001",
    status: "ACTIVE",
  },
  admin: {
    id: "adm-1",
    name: "S. Verma (Administrative Officer)",
    email: "admin@gatekeeper.edu",
    role: "admin",
    employeeId: "ADM001",
    status: "ACTIVE",
  },
  sysadmin: {
    id: "sys-1",
    name: "System Administrator",
    email: "sysadmin@gatekeeper.edu",
    role: "sysadmin",
    employeeId: "SYS001",
    status: "ACTIVE",
  },
  student: {
    id: "stu-1",
    name: "K. Rajesh (CSE 4th Year)",
    email: "student@gatekeeper.edu",
    role: "student",
    employeeId: "24JJ1A0501",
    status: "ACTIVE",
  },
  parent: {
    id: "par-1",
    name: "P. Rao (Parent)",
    email: "parent@gatekeeper.edu",
    role: "parent",
    employeeId: "PAR001",
    status: "ACTIVE",
  },
  warden: {
    id: "wd-1",
    name: "H. Warden",
    email: "warden@gatekeeper.edu",
    role: "warden",
    employeeId: "WD001",
    status: "ACTIVE",
  },
  faculty: {
    id: "fac-1",
    name: "Dr. K. Faculty",
    email: "faculty@gatekeeper.edu",
    role: "faculty",
    employeeId: "FAC-001",
    status: "ACTIVE",
  },
  staff: {
    id: "stf-1",
    name: "M. Staff",
    email: "staff@gatekeeper.edu",
    role: "staff",
    employeeId: "STF-001",
    status: "ACTIVE",
  },
  worker: {
    id: "wrk-1",
    name: "J. Worker",
    email: "worker@gatekeeper.edu",
    role: "worker",
    employeeId: "WRK-001",
    status: "ACTIVE",
  },
  visitor: {
    id: "vis-1",
    name: "V. Visitor",
    email: "visitor@gatekeeper.edu",
    role: "visitor",
    employeeId: "VIS-001",
    status: "ACTIVE",
  },
};

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
          console.error("Login error:", error);
        }

        set({ loading: false });
        return { success: false, error: "Invalid credentials" };
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
          console.error("PIN login error:", error);
        }

        set({ loading: false });
        return { success: false, error: "Invalid PIN" };
      },

      autoLoginAsRole: (targetRole: Role) => {
        const user = DEMO_USERS_BY_ROLE[targetRole] || {
          id: `demo-${targetRole}-1`,
          name: `Demo ${targetRole}`,
          email: `${targetRole}@gatekeeper.edu`,
          role: targetRole,
          status: "ACTIVE",
        };
        const token = `auto-token-${targetRole}-${Date.now()}`;
        set({ user, token, role: targetRole, authenticated: true, loading: false });
        if (typeof window !== "undefined") {
          sessionStorage.setItem("gate-monitor-role", targetRole);
          localStorage.setItem("gate-monitor-role", targetRole);
          localStorage.setItem("gate-monitor-token", token);
        }
        return { user, token };
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
