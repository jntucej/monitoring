// src/lib/api-chain.ts
// U7: Thin hybrid security/request orchestrator (`withApiChain`).
//
// Composes existing U3/U4/U5/U6, auth, RBAC, and CSRF primitives in the
// canonical order without replacing or rewriting them:
//
//   Authenticated (`auth: "user"`, default):
//     withAuthorization (identity + RBAC + metricsMiddleware + U6 log)
//       → withRateLimit (user-scoped bucket via verified x-user-id)
//       → assertCsrf (header-only, if mutating & csrf !== false)
//       → validateBody (U5 single streamed read, if bodySchema)
//       → handler(req, { auth, body, requestId })
//       → handleApiError (U3 canonical error normalization)
//
//   Public / Pre-auth (`auth: "none"`):
//     withRateLimit (IP/key-scoped bucket + U6 log)
//       → assertCsrf (if csrf === true)
//       → validateBody (U5 single streamed read, if bodySchema)
//       → handler(req, { auth: null, body, requestId })
//       → handleApiError (U3 canonical error normalization)

import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { Role } from "@/lib/types";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { validateBody } from "@/lib/validate-body";
import { handleApiError } from "@/lib/api-error-handler";
import { getRequestId, logRequest } from "@/lib/log";

export interface ApiChainContext<TBody = unknown, TAuth extends AuthContext | null = AuthContext> {
  auth: TAuth;
  body: TBody;
  requestId: string;
}

export interface ApiChainOptions<TBody = unknown> {
  route: string;
  /** "user" (default) enforces withAuthorization; "none" is for public/pre-auth routes. */
  auth?: "user" | "none";
  requiredRole?: Role | Role[];
  requiredPermission?: string;
  allowInactive?: boolean;
  /** Default: true for authenticated mutations, false for auth: "none". */
  csrf?: boolean;
  /** Rate-limit config, or false to disable. */
  rateLimit?: RateLimitConfig | false;
  /** Optional U5 Zod schema for JSON body validation. */
  bodySchema?: z.ZodType<TBody>;
  maxBodyBytes?: number;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function withApiChain<TBody = unknown>(
  handler: (req: NextRequest, ctx: ApiChainContext<TBody, AuthContext>) => Promise<Response>,
  options: ApiChainOptions<TBody> & { auth?: "user" }
): (req: NextRequest) => Promise<Response>;

export function withApiChain<TBody = unknown>(
  handler: (req: NextRequest, ctx: ApiChainContext<TBody, null>) => Promise<Response>,
  options: ApiChainOptions<TBody> & { auth: "none" }
): (req: NextRequest) => Promise<Response>;

export function withApiChain<TBody = unknown>(
  handler: (req: NextRequest, ctx: ApiChainContext<TBody, any>) => Promise<Response>,
  options: ApiChainOptions<TBody>
): (req: NextRequest) => Promise<Response> {
  const authMode = options.auth ?? "user";
  const csrfEnabled = options.csrf ?? authMode === "user";

  const runCore = async (req: NextRequest, auth: AuthContext | null): Promise<Response> => {
    const requestId = getRequestId(req);
    try {
      if (csrfEnabled && !SAFE_METHODS.has(req.method.toUpperCase())) {
        const csrfErr = assertCsrf(req);
        if (csrfErr) return csrfErr;
      }

      let body = undefined as TBody;
      if (options.bodySchema) {
        const bodyRes = await validateBody(req, options.bodySchema, {
          route: options.route,
          maxBytes: options.maxBodyBytes,
        });
        if (!bodyRes.ok) return bodyRes.response;
        body = bodyRes.data;
      }

      return await handler(req, { auth, body, requestId });
    } catch (err) {
      return handleApiError(err, { route: options.route });
    }
  };

  if (authMode === "none") {
    if (options.rateLimit !== false) {
      return withRateLimit(
        (req: NextRequest) => runCore(req, null),
        options.rateLimit ?? {}
      );
    }
    return async (req: NextRequest): Promise<Response> => {
      const start = Date.now();
      const requestId = getRequestId(req);
      const res = await runCore(req, null);
      logRequest({
        request_id: requestId,
        method: req.method,
        route: options.route,
        status: res.status,
        duration_ms: Date.now() - start,
        source: "web",
        error_code: res.headers.get("x-error-code"),
      });
      try { res.headers.delete("x-error-code"); } catch {}
      return res;
    };
  }

  // Authenticated mode: withAuthorization runs FIRST so verified x-user-id is
  // available to withRateLimit (user-scoped bucket, not IP-scoped).
  const innerWithRateLimit =
    options.rateLimit !== false
      ? (req: NextRequest, ctx: { auth: AuthContext }) =>
          withRateLimit(
            (r: NextRequest) => runCore(r, ctx.auth),
            options.rateLimit as RateLimitConfig
          )(req)
      : (req: NextRequest, ctx: { auth: AuthContext }) => runCore(req, ctx.auth);

  return withAuthorization(innerWithRateLimit, {
    requiredRole: options.requiredRole,
    requiredPermission: options.requiredPermission,
    allowInactive: options.allowInactive,
  });
}
