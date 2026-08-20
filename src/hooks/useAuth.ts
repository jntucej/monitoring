/**
 * useAuth hook — wraps the auth store for convenient access in React components.
 * Handles auto-login with seeded credentials for demo mode.
 */
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

const DEMO_CREDENTIALS: Record<Role, { login: string; password: string }> = {
  operator: { login: "OP001", password: "1234" },
  supervisor: { login: "SV001", password: "3456" },
  admin: { login: "AD001", password: "1234" },
  sysadmin: { login: "SA001", password: "1234" },
  parent: { login: "PA001", password: "1234" },
  student: { login: "stu-1", password: "password" },
  warden: { login: "WD001", password: "1234" },
  faculty: { login: "FAC-001", password: "1234" },
  staff: { login: "STF-001", password: "1234" },
  worker: { login: "WRK-001", password: "1234" },
  visitor: { login: "VIS-001", password: "1234" },
};

export function useAuth() {
  const { user, token, role, authenticated, loading, login, pinLogin, logout, setRole } = useAuthStore();
  const router = useRouter();

  /**
   * Auto-login for demo mode — logs in as the given role using seeded credentials.
   * In production this would be replaced by a proper login form / SSO.
   */
  const loginAsRole = useCallback(async (targetRole: Role) => {
    useAuthStore.getState().autoLoginAsRole(targetRole);
    return true;
  }, []);

  const requireAuth = useCallback((allowedRoles?: Role[]) => {
    if (!authenticated) {
      router.push("/login");
      return false;
    }
    if (allowedRoles && !allowedRoles.includes(role as Role)) {
      router.push("/");
      return false;
    }
    return true;
  }, [authenticated, role, router]);

  return {
    user,
    token,
    role,
    authenticated,
    loading,
    login,
    pinLogin,
    logout,
    loginAsRole,
    requireAuth,
  };
}
