"use client";
import { useEffect, useRef, useMemo } from "react";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { getDefaultRouteForRole } from "@/lib/route-helpers";
import { AppLoadingScreen } from "@/components/shared/AppLoadingScreen";
import { AuthGuard } from "./AuthGuard";
import { hasCapability } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";

export interface GuardedPageProps {
  allowedRoles?: Role[];
  minTier?: number;
  /**
   * P1: gate on a capability id instead of a role list. When present, the
   * page renders only if `hasCapability(role, ctx, capability)` passes.
   * `allowedRoles`/`minTier` remain as an alias for one release cycle;
   * after that, capability is the path and role is removed.
   */
  capability?: string;
  /** The workspace context to evaluate the capability against. */
  context?: WorkspaceContext;
  children: React.ReactNode;
}

export function GuardedPage({ allowedRoles, minTier = 0, capability, context, children }: GuardedPageProps) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const role = (user?.role ?? "student") as Role;
  const tier = getRoleTier(role);
  const router = useRouter();

  const roleOk = allowedRoles ? allowedRoles.includes(role) : true;
  // Tier gate only applies when an allowedRoles list was NOT provided
  // (a role list already encodes the intended audience).
  const tierOk = allowedRoles ? true : tier >= minTier;

  // P1: capability gate. If a capability id is present, the page renders
  // only when the resolver grants it. This is the same call site the API
  // route uses (server-consistent), so client and server agree.
  const capOk = capability && context
    ? hasCapability(role, context, capability)
    : true; // no capability → fall back to role/tier only

  // Guard against double-mount in React strict mode — single render pass
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    if ((!roleOk || !tierOk) || !capOk) {
      const defaultRoute = getDefaultRouteForRole(role);
      router.replace(defaultRoute);
    }
  }, [roleOk, tierOk, capOk, role, router]);

  // Fix 6: if auth status === 'loading' → render <AppLoadingScreen/> and NOTHING else
  if (!hasHydrated || !user) {
    return <AppLoadingScreen />;
  }

  if ((!roleOk || !tierOk) || !capOk) {
    return <AppLoadingScreen />;
  }

  return <AuthGuard allowedRoles={allowedRoles}>{children}</AuthGuard>;
}
