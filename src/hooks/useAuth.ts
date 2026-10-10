"use client";

import { useCallback } from "react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";

export function useAuth() {
  // Subscribe via selectors so this hook re-renders when the store changes
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const authenticated = useAuthStore((s) => s.authenticated);
  const loading = useAuthStore((s) => s.loading);
  const hydrated = useHasHydrated();

  const login = useAuthStore((s) => s.login);
  const pinLogin = useAuthStore((s) => s.pinLogin);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const requireAuth = useCallback((allowedRoles?: Role[]) => {
    if (!hydrated) return false;
    if (!authenticated) {
      router.replace("/login");
      return false;
    }
    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
      router.replace("/");
      return false;
    }
    return true;
  }, [hydrated, authenticated, role, router]);

  return {
    user,
    token,
    role,
    authenticated,
    loading: loading || !hydrated,
    hydrated,
    login,
    pinLogin,
    logout,
    requireAuth,
  };
}
