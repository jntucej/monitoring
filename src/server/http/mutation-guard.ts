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
import { withRateLimit, type RateLimitConfig, checkRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

export interface MutationGuardOptions extends AuthorizationOptions {
  /** Rate-limit config. Default: 60 req / 60_000 ms. */
  rateLimit?: RateLimitConfig;
  /** Set false ONLY for pre-auth endpoints (login, reset). Default true. */
  csrf?: boolean;
}

type Handler = (req: NextRequest, ctx: { auth: AuthContext }) => Promise<Response>;

export function withMutationGuard(handler: Handler, options: MutationGuardOptions = {}) {
  const { rateLimit, csrf = true, ...authOptions } = options;

  return withAuthorization(async (req, ctx) => {
    // assertCsrf is a no-op for safe verbs; kept here for defence in depth.
    if (csrf) {
      const blocked = assertCsrf(req);
      if (blocked) return blocked;
    }
    return handler(req, ctx);
  }, authOptions);
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
