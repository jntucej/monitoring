// src/server/http/mutation-guard.ts
// ─────────────────────────────────────────────────────────────────────────────
// Wraps a route handler and enforces the canonical middleware order for
// mutating verbs. Fixes audit issue #1 (missing CSRF) and #39 (order drift).
//
// Chain (outermost → innermost):
//   1. withAuthorization      — identity, session_version, MFA gate
//   2. withRateLimit          — keyed by authenticated user (not IP)
//   3. assertCsrf             — origin/host check on POST/PUT/PATCH/DELETE
//   4. handler
//
// Usage:
//   export const POST = withMutationGuard(async (req, { auth }) => { ... });
// ─────────────────────────────────────────────────────────────────────────────

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuthorization, type AuthorizationOptions } from "@/middleware/authorization";
import { type RateLimitConfig, checkRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

export interface MutationGuardOptions extends AuthorizationOptions {
  /** Rate-limit config. Default: 60 req / 60_000 ms. */
  rateLimit?: RateLimitConfig;
  /** Set false ONLY for pre-auth endpoints (login, reset). Default true. */
  csrf?: boolean;
  /** Set false ONLY when the route genuinely cannot be trusted-header signed. Default true. */
  trustedHeaders?: boolean;
  /**
   * M1 — Step-up re-authentication. When true, the handler is only invoked
   * after a fresh password step-up (< 5 min). A stolen cookie alone cannot
   * trigger the route; 401 + code STEP_UP_REQUIRED tells the UI to prompt.
   */
  requiresStepUp?: boolean;
}

type Handler = (req: NextRequest, ctx: { auth: AuthContext }) => Promise<Response>;

export function withMutationGuard(handler: Handler, options: MutationGuardOptions = {}) {
  const { rateLimit, csrf = true, trustedHeaders = true, requiresStepUp, ...authOptions } = options;
  const effectiveRateLimit: RateLimitConfig = rateLimit ?? { windowMs: 60_000, maxRequests: 60 };

  // M1: step-up guard runs inside the auth boundary (needs ctx.auth.userId),
  // just before the CSRF/trusted-header guards. Lazy import so the module
  // loads only when a route actually declares requiresStepUp.
  const stepUpGuard: Handler = async (req, ctx) => {
    if (requiresStepUp) {
      const { assertFreshStepUp } = await import("@/lib/step-up");
      try {
        await assertFreshStepUp(ctx.auth.userId);
      } catch (err) {
        if (err instanceof Error && err.name === "StepUpRequiredError") {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "STEP_UP_REQUIRED",
                message: "Re-enter your password to continue.",
              },
            },
            { status: 401 },
          );
        }
        throw err;
      }
    }
    return handler(req, ctx);
  };

  // Chain: withAuthorization → user-rate-limit → requireTrustedHeaders → assertCsrf → step-up → handler
  const csrfGuard: Handler = async (req, ctx) => {
    if (trustedHeaders) {
      const untrusted = requireTrustedHeaders(req);
      if (untrusted) return untrusted;
    }
    if (csrf) {
      const blocked = assertCsrf(req);
      if (blocked) return blocked;
    }
    return stepUpGuard(req, ctx);
  };

  const rateLimited: Handler = async (req, ctx) => {
    const key = `user:${ctx.auth.userId}`;
    const result = await checkRateLimit(key, effectiveRateLimit);
    if (result.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            resetAt: result.resetTime.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": (result.retryAfter || 60).toString(),
            "X-RateLimit-Limit": (effectiveRateLimit.maxRequests || 60).toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetTime.toISOString(),
          },
        },
      );
    }
    const response = await csrfGuard(req, ctx);
    response.headers.set("X-RateLimit-Limit", (effectiveRateLimit.maxRequests || 60).toString());
    if (result.remaining !== undefined) {
      response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    }
    if (result.resetTime) {
      response.headers.set("X-RateLimit-Reset", result.resetTime.toISOString());
    }
    return response;
  };

  return withAuthorization(rateLimited, authOptions);
}

/** Rate-limit a mutating route keyed by the authenticated user id. */
export function withRateLimitByUser(
  handler: Handler,
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 },
): Handler {
  return async (req, ctx) => {
    const key = `user:${ctx.auth.userId}`;
    const result = await checkRateLimit(key, config);
    if (result.limited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            resetAt: result.resetTime.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": (result.retryAfter || 60).toString(),
            "X-RateLimit-Limit": (config.maxRequests || 60).toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": result.resetTime.toISOString(),
          },
        },
      );
    }
    const response = await handler(req, ctx);
    response.headers.set("X-RateLimit-Limit", (config.maxRequests || 60).toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.resetTime.toISOString());
    return response;
  };
}

/**
 * Convenience wrapper for admin-owned mutating routes.
 * Bakes in requiredRole ['admin','sysadmin'] and the full triad
 * (rate-limit + trusted-headers + csrf) so callers only supply the handler.
 */
export function withAdminMutation(
  handler: Handler,
  options: Omit<MutationGuardOptions, "requiredRole"> = {},
) {
  return withMutationGuard(handler, {
    ...options,
    requiredRole: ["admin", "sysadmin"],
  });
}

/**
 * Convenience wrapper for mess-console mutating routes.
 * Bakes in requiredRole [mess_incharge, principal, admin, sysadmin]
 * (TIER.MESS_INCHARGE) plus the full mutation triad. Used by all
 * POST/PATCH/DELETE endpoints the /mess console calls.
 */
export function withMessMutation(
  handler: Handler,
  options: Omit<MutationGuardOptions, "requiredRole"> = {},
) {
  return withMutationGuard(handler, {
    ...options,
    requiredRole: TIER.MESS_INCHARGE,
  });
}

export default withMutationGuard;
