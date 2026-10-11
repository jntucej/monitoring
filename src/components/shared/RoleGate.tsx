"use client";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { FEATURE_RULES, GLOBAL_HIDDEN_FEATURES, type FeatureRule } from "@/lib/ui-gates";
import type { Role } from "@/lib/types";

export interface RoleGateProps {
  feature: string;
  /** Optional inline override (bypasses the registry) */
  rule?: FeatureRule;
  /** What to render when blocked. Default: nothing. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ feature, rule, fallback = null, children }: RoleGateProps) {
  const role = (useAuthStore((s) => s.user?.role) ?? "") as Role | "";
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
