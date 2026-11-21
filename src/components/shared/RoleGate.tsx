"use client";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { FEATURE_RULES, GLOBAL_HIDDEN_FEATURES, type FeatureRule } from "@/lib/ui-gates";
import type { Role } from "@/lib/types";
import { hasCapability } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";

export interface RoleGateProps {
  feature: string;
  /** Optional inline override (bypasses the registry) */
  rule?: FeatureRule;
  /** What to render when blocked. Default: nothing. */
  fallback?: React.ReactNode;
  /**
   * P1: gate on a capability id instead of the feature registry. When
   * present, the gate uses `hasCapability(role, context, capability)` —
   * the config-driven resolver — instead of the role-based FEATURE_RULES.
   * `feature` + `rule` stay as the alias path for one release cycle.
   */
  capability?: string;
  /** The workspace context to evaluate the capability against. */
  context?: WorkspaceContext;
  children: React.ReactNode;
}

export function RoleGate({ feature, rule, fallback = null, capability, context, children }: RoleGateProps) {
  const role = (useAuthStore((s) => s.user?.role) ?? "") as Role | "";

  // P1: capability path (config-driven). Same resolver the API uses.
  if (capability && context) {
    const ok = role ? hasCapability(role, context, capability) : false;
    return ok ? <>{children}</> : <>{fallback}</>;
  }

  // Legacy role/feature path (kept as an alias for one release cycle).
  if (GLOBAL_HIDDEN_FEATURES.includes(feature)) return <>{fallback}</>;
  if (!role) return <>{fallback}</>; // unauthenticated → hidden
  const r = rule ?? FEATURE_RULES[feature];
  if (!r) return <>{children}</>; // unknown feature → fail-open
  if (r.deny?.includes(role)) return <>{fallback}</>;
  if (r.allow && !r.allow.includes(role)) return <>{fallback}</>;
  if (typeof r.minTier === "number" && getRoleTier(role) < r.minTier) return <>{fallback}</>;
  return <>{children}</>;
}

/** Imperative check for code paths that can't render JSX. */
export function useHasFeature(feature: string): boolean {
  const role = (useAuthStore((s) => s.user?.role) ?? "") as Role | "";
  if (!role) return false;
  if (GLOBAL_HIDDEN_FEATURES.includes(feature)) return false;
  const r = FEATURE_RULES[feature];
  if (!r) return true;
  if (r.deny?.includes(role)) return false;
  if (r.allow && !r.allow.includes(role)) return false;
  if (typeof r.minTier === "number" && getRoleTier(role) < r.minTier) return false;
  return true;
}
