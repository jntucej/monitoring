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

  useEffect(() => {
    // Wait until store has hydrated from localStorage
    if (!hasHydrated) return;

    // If not authenticated or no user set, redirect to login with role hint if available
    if (!authenticated || !user) {
      let targetRole: Role | null = null;

      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.startsWith("/gate")) targetRole = "operator";
        else if (path.startsWith("/admin")) targetRole = "admin";
        else if (path.startsWith("/sysadmin")) targetRole = "sysadmin";
        else if (path.startsWith("/student")) targetRole = "student";
        else if (path.startsWith("/parent")) targetRole = "parent";
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
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      const defaultRoute = getDefaultRouteForRole(user.role, user.gateId);
      router.replace(defaultRoute);
      return;
    }

    setIsChecking(false);

    // Revalidate session asynchronously in background without blocking rendering
    checkSession();
  }, [user, authenticated, allowedRoles, router, hasHydrated, checkSession]);

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
