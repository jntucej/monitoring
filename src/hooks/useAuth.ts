/**
 * useAuth hook — wraps the auth store for convenient access in React components.
 * Handles auto-login with seeded credentials for demo mode.
 */
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

export function useAuth() {
  const { user, token, role, authenticated, loading, login, pinLogin, logout } = useAuthStore();
  const router = useRouter();

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
    requireAuth,
  };
}
