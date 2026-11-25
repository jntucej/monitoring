// src/lib/rate-limit-policies.ts
// U4 gap C: Central per-route rate-limit policy map.
//
// Named presets are the INITIAL defaults (provisional — to be tuned in U4b
// from observed traffic + rejection rates). Per-route inline config always
// wins over the policy default, so tightening one route never requires
// touching the map.
//
// Usage (route side, mechanical):
//   import { Policies, policyForRoute } from "@/lib/rate-limit-policies";
//   export const POST = withRateLimit(handler, policyForRoute("/api/auth/login"));
//
// Or, keep the existing inline style and just reference the preset:
//   export const POST = withRateLimit(handler, Policies.auth);

import type { RateLimitConfig } from "@/lib/rate-limit";

export type RateLimitCategory =
  | "auth"
  | "otp"
  | "default"
  | "dashboard"
  | "admin-mutation"
  | "expensive";

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  /** Fail-closed when no shared store is reachable? */
  failClosed?: boolean;
}

/**
 * Initial limits — PROVISIONAL (decision: keep as starting values, tune in U4b).
 * Window is per-minute (60s) for every preset.
 */
export const Policies: Record<RateLimitCategory, RateLimitPolicy> = {
  // Credential-guessing surface: smallest budget, fail-closed on outage.
  auth: { windowMs: 60_000, maxRequests: 10, keyPrefix: "auth", failClosed: true },
  // OTP / verification codes: tighter than auth (code expiry + resend cost).
  otp: { windowMs: 60_000, maxRequests: 5, keyPrefix: "otp", failClosed: true },
  // General authenticated API traffic.
  default: { windowMs: 60_000, maxRequests: 120, keyPrefix: "rl", failClosed: false },
  // Read-heavy dashboard panels (chart refresh, panel fan-out).
  dashboard: { windowMs: 60_000, maxRequests: 180, keyPrefix: "rl", failClosed: false },
  // Sensitive administrative mutations: small budget, fail-closed on outage
  // (an unbounded mutation window during a store outage is a blast-radius risk).
  "admin-mutation": { windowMs: 60_000, maxRequests: 20, keyPrefix: "admin-mutation", failClosed: true },
  // Expensive operations (image/doc generation, token regeneration, bulk export).
  expensive: { windowMs: 60_000, maxRequests: 5, keyPrefix: "expensive", failClosed: false },
};

/** Pathname → category (longest-prefix match). */
const ROUTE_CATEGORIES: Array<[prefix: string, category: RateLimitCategory]> = [
  // auth + otp (checked first — most specific)
  ["/api/auth/login", "auth"],
  ["/api/auth/bootstrap", "auth"],
  ["/api/auth/change-password", "auth"],
  ["/api/auth/step-up", "auth"],
  ["/api/auth/reset-password", "otp"],
  ["/api/auth/passkeys/register/verify", "otp"],
  ["/api/auth/passkeys/authenticate/verify", "otp"],
  ["/api/auth/", "auth"],
  // admin mutations
  ["/api/sysadmin/", "admin-mutation"],
  // expensive operations
  ["/generate", "expensive"],
  ["/direct-generate", "expensive"],
  ["/regenerate", "expensive"],
  ["/api/export/", "expensive"],
  // dashboard reads
  ["/api/dashboard/", "dashboard"],
  ["/api/admin/", "dashboard"],
];

/**
 * Resolve the policy for a route pathname. An explicit config (per-route
 * override) always wins; otherwise the longest matching path prefix sets
 * the category; anything unmatched falls back to `default`.
 */
export function policyForRoute(
  pathname: string,
  explicit?: RateLimitConfig
): RateLimitConfig {
  if (explicit) return explicit;
  let best: { prefix: string; category: RateLimitCategory } | null = null;
  for (const [prefix, category] of ROUTE_CATEGORIES) {
    if (pathname.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
      best = { prefix, category };
    }
  }
  const policy = Policies[best ? best.category : "default"];
  return {
    windowMs: policy.windowMs,
    maxRequests: policy.maxRequests,
    keyPrefix: policy.keyPrefix,
  };
}

/** Whether a route's category fails closed when no shared store is reachable. */
export function routeFailsClosed(pathname: string): boolean {
  let best: { prefix: string; category: RateLimitCategory } | null = null;
  for (const [prefix, category] of ROUTE_CATEGORIES) {
    if (pathname.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
      best = { prefix, category };
    }
  }
  return Policies[best ? best.category : "default"].failClosed === true;
}
