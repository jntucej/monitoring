"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import type { Role } from "@/lib/types";

import { getDefaultRouteForRole } from "@/lib/route-helpers";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { user, authenticated, checkSession } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  const userId = user?.id;
  const userRole = user?.role;
  const gateId = user?.gateId;

  useEffect(() => {
    // Wait until store has hydrated from localStorage/sessionStorage
    if (!hasHydrated) return;

    // If not authenticated or no user set, redirect to login
    if (!authenticated || !userId) {
      let targetRole: Role | null = null;

      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.startsWith("/sysadmin")) targetRole = "sysadmin";
        else if (path.startsWith("/admin")) targetRole = "admin";
        else if (path.startsWith("/gate")) targetRole = "operator";
        else if (path.startsWith("/student")) targetRole = "student";
        else if (path.startsWith("/parent")) targetRole = "parent";
        else if (path.startsWith("/supervisor") || path.startsWith("/warden")) targetRole = "supervisor";
        else if (path.startsWith("/person")) targetRole = "student";
      }

      if (!targetRole && allowedRoles && allowedRoles.length > 0) {
        targetRole = allowedRoles[0];
      }

      const loginUrl = targetRole ? `/login?role=${targetRole}` : "/login";
      router.replace(loginUrl);
      return;
    }

    // Check role authorization if specified
    if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
      const defaultRoute = getDefaultRouteForRole(userRole, gateId);
      router.replace(defaultRoute);
      return;
    }

    setIsChecking(false);
  }, [hasHydrated, authenticated, userId, userRole, gateId, allowedRoles, router]);

  // Revalidate session asynchronously in background without causing infinite re-render loop
  useEffect(() => {
    if (!hasHydrated || !authenticated || !userId) return;

    checkSession();

    // Auto-refresh session check every 5 minutes
    const interval = setInterval(() => {
      checkSession();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [hasHydrated, authenticated, userId, checkSession]);

  if (!hasHydrated || isChecking || !authenticated || !user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Verifying security credentials...</p>
      </div>
    );
  }

  return <>{children}</>;
}
