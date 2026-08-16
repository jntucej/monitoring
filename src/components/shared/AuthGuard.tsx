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
    // Check authentication
    if (!authenticated || !user) {
      router.replace("/login");
      return;
    }

    // Check role authorization if specified
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect to user's authorized home or login
      switch (user.role) {
        case "admin":
          router.replace("/admin");
          break;
        case "operator":
          router.replace("/gate/main-gate-1");
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
