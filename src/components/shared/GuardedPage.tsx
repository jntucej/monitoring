"use client";
import { useEffect, useRef } from "react";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { getDefaultRouteForRole } from "@/lib/route-helpers";
import { AppLoadingScreen } from "@/components/shared/AppLoadingScreen";
import { ShieldAlert } from "lucide-react";
import { AuthGuard } from "./AuthGuard";

export interface GuardedPageProps {
  allowedRoles?: Role[];
  minTier?: number;
  children: React.ReactNode;
}

export function GuardedPage({ allowedRoles, minTier = 0, children }: GuardedPageProps) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "student") as Role;
  const tier = getRoleTier(role);
  const router = useRouter();

  const roleOk = allowedRoles ? allowedRoles.includes(role) : true;
  const tierOk = tier >= minTier;

  // Guard against double-mount in React strict mode — single render pass
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    if (!roleOk || !tierOk) {
      const defaultRoute = getDefaultRouteForRole(role);
      router.replace(defaultRoute);
    }
  }, [roleOk, tierOk, role, router]);

  // Show loading screen while auth resolves — prevents bounce-loop flash
  if (!user || !roleOk || !tierOk) {
    return <AppLoadingScreen />;
  }

  return <AuthGuard allowedRoles={allowedRoles}>{children}</AuthGuard>;
}
