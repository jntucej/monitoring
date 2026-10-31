"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const [timedOut, setTimedOut] = useState(false);
  const redirectCountRef = useRef(0);
  const handledRef = useRef(false);

  const userId = user?.id;
  const userRole = user?.role;
  const gateId = user?.gateId;

  // Fix 6: set data-user-role on body for CSS/a11y
  useEffect(() => {
    if (userRole && typeof document !== "undefined") {
      document.body.setAttribute("data-user-role", userRole);
    }
  }, [userRole]);

  useEffect(() => {
    if (hasHydrated) return;
    const t = setTimeout(() => {
      try {
        useAuthStore.persist?.rehydrate();
      } catch {
        useAuthStore.getState().setHasHydrated(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [hasHydrated]);

  useEffect(() => {
    // Wait until store has hydrated from localStorage/sessionStorage
    if (!hasHydrated) return;

    // If not authenticated or no user set, redirect to login — guard against loops
    if (!authenticated || !userId) {
      if (handledRef.current) return;
      handledRef.current = true;

      let targetRole: Role | null = null;

      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.startsWith("/sysadmin")) targetRole = "sysadmin";
        else if (path.startsWith("/admin")) targetRole = "admin";
        else if (path.startsWith("/gate") || path.startsWith("/operator")) targetRole = "operator";
        else if (path.startsWith("/student")) targetRole = "student";
        else if (path.startsWith("/parent")) targetRole = "guardian";
        else if (path.startsWith("/worker")) targetRole = "worker";
        else if (path.startsWith("/supervisor")) targetRole = "supervisor";
        else if (path.startsWith("/principal")) targetRole = "principal";
        else if (path.startsWith("/vice-principal")) targetRole = "vice_principal";
        else if (path.startsWith("/mess")) targetRole = "mess_incharge";
        else if (path.startsWith("/hostel-manager")) targetRole = "hostel_manager";
        else if (path.startsWith("/deputy-warden")) targetRole = "deputy_warden";
        else if (path.startsWith("/caretaker")) targetRole = "caretaker";
        else if (path.startsWith("/exam-branch")) targetRole = "exam_branch";
        else if (path.startsWith("/exam/superintendent")) targetRole = "exam_superintendent";
        else if (path.startsWith("/oie")) targetRole = "oie";
        else if (path.startsWith("/hod")) targetRole = "hod";
        else if (path.startsWith("/staff")) targetRole = "staff";
        else if (path.startsWith("/faculty")) targetRole = "faculty";
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
      if (redirectCountRef.current >= 3) return; // 3-strike guard
      redirectCountRef.current += 1;
      const defaultRoute = getDefaultRouteForRole(userRole, gateId);
      router.replace(defaultRoute);
      return;
    }

    setIsChecking(false);
  }, [hasHydrated, authenticated, userId, userRole, gateId, allowedRoles, router]);

  // Revalidate session asynchronously
  useEffect(() => {
    if (!hasHydrated || !authenticated || !userId) return;
    checkSession();
  }, [hasHydrated, authenticated, userId, checkSession]);

  if (timedOut && !hasHydrated) {
    router.replace("/login");
    return (
      <div className="min-h-screen min-h-dvh w-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Verifying security credentials...</p>
      </div>
    );
  }

  if (!hasHydrated || isChecking || !authenticated || !user) {
    return (
      <div className="min-h-screen min-h-dvh w-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Verifying security credentials...</p>
      </div>
    );
  }

  return <>{children}</>;
}
