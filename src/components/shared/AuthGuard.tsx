"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const { user, authenticated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Fast path: check localStorage synchronously to prevent redirect flicker on page refresh/hydration lag
    let activeAuth = authenticated;
    let activeUser = user;

    if (!activeAuth || !activeUser) {
      try {
        const raw = localStorage.getItem("gate-monitor-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.state && parsed.state.authenticated && parsed.state.user) {
            activeAuth = true;
            activeUser = parsed.state.user;
          }
        }
      } catch (err) {
        console.error("AuthGuard storage check error:", err);
      }
    }

    // If still not authenticated or no user set, redirect to login with role hint if available
    if (!activeAuth || !activeUser) {
      let targetRole: Role | null = null;

      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path.startsWith("/gate")) targetRole = "operator";
        else if (path.startsWith("/supervisor")) targetRole = "supervisor";
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
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(activeUser.role)) {
      switch (activeUser.role) {
        case "admin":
          router.replace("/admin");
          break;
        case "operator":
          router.replace("/gate/1");
          break;
        case "supervisor":
          router.replace("/supervisor/live");
          break;
        case "student":
          router.replace("/student");
          break;
        case "parent":
          router.replace("/parent");
          break;
        case "sysadmin":
          router.replace("/sysadmin");
          break;
        default:
          router.replace("/login");
      }
      return;
    }

    setIsChecking(false);
  }, [user, authenticated, allowedRoles, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Verifying security credentials...</p>
      </div>
    );
  }

  return <>{children}</>;
}
