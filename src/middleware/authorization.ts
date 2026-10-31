import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { randomUUID } from "crypto";
import type { Role } from "@/lib/types";
import {
  requireAuthenticatedUser as requireAuthUser,
  requirePermission as requireAuthPermission,
  validateResourceOperation as validateResourceOp,
  getGateStudentInfo,
  type AuthContext,
} from "@/lib/authContext";
import { getRequestBody, setupBodyCaching } from "@/lib/body-cache";
import { signTrustedHeaders } from "@/server/http/trusted-headers";
import { metricsMiddleware } from "@/middleware/metrics";

class AuthError extends Error {
  constructor(code: string, message: string, public status: number) {
    super(message);
    this.name = "AuthError";
    Object.defineProperty(this, "code", { value: code, enumerable: true });
  }
}

export interface AuthorizationOptions {
  requiredRole?: Role | Role[];
  requiredPermission?: string;
  allowInactive?: boolean;
  resourceType?: string;
  resourceIdParam?: string;
  operation?: string;
}

function bearer(req: NextRequest): string {
  // The Authorization header is "Bearer <jwt>" (or, from some clients, a raw
  // JWT). Strip the scheme prefix so jwtVerify gets a clean token. Without
  // this every authenticated request 401s ("JWT verify failed, token= Bearer
  // eyJ...") and every role UI bounces back to /login.
  const raw = (req.headers.get("authorization") || "").trim();
  const m = raw.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  // Fall back to the access_token cookie (set by /api/auth/login) for
  // clients that carry the httpOnly cookie but no Authorization header.
  const cookie = req.cookies.get("access_token")?.value;
  return cookie || raw;
}

async function handleAuthError(err: unknown): Promise<NextResponse> {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: { code: (err as any).code ?? "AUTH_ERROR", message: err.message } },
      { status: err.status }
    );
  }
  // requireAuthenticatedUser (and friends) throw plain `new Error('UNAUTHORIZED: ...')`
  // rather than an AuthError instance. Catch that prefix here so a missing or
  // invalid token returns 401 (not 500) — 500 leaks "this endpoint exists and
  // has auth" to external scanners; 401 is the correct, non-informative answer.
  const plain = err instanceof Error ? err.message : "";
  if (/^UNAUTHORIZED:|^FORBIDDEN:|^ACCOUNT_INACTIVE:/.test(plain)) {
    const code = plain.split(":")[0].replace(/_$/, "");
    const status = code === "FORBIDDEN" ? 403 : code === "ACCOUNT_INACTIVE" ? 403 : 401;
    return NextResponse.json(
      { success: false, error: { code, message: plain.replace(/^UNAUTHORIZED:\s*/i, "") } },
      { status },
    );
  }
  const msg = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: msg } },
    { status: 500 }
  );
}

export function withAuthorization(
  handler: (req: NextRequest, context: { auth: AuthContext }) => Promise<Response>,
  options: AuthorizationOptions = {}
) {
  return async (req: NextRequest): Promise<Response> => {
    return metricsMiddleware(req, async () => {
      const url = new URL(req.url);
      const path = url.pathname;
      const isAdminPath = path.startsWith("/api/admin/") || path.startsWith("/api/sysadmin/");
      const effectiveRequiredRole = options.requiredRole ?? (isAdminPath ? ["admin", "sysadmin"] : undefined);
      // No-body fast path (GET, no-body DELETE, ...): setupBodyCaching would
      // still call `await req.text()` on the original request, which locks its
      // body stream and — in undici/Node 20 — poisons the response object the
      // route handler later creates, surfacing as a 500
      // "Response body object should not be disturbed or locked" on every
      // bodyless route that flows through this chain. For a request with no
      // body there is nothing to cache, so forward a clean NextRequest and
      // skip the whole re-wrap.
      const hasBody =
        req.method !== "GET" && req.method !== "HEAD" &&
        req.body !== null;
      const { req: cachedReq, hash: bodyHash } = hasBody
        ? await setupBodyCaching(req)
        : { req, hash: null };
      try {
        const auth = await requireAuthUser(bearer(req));
        if (!options.allowInactive && !auth.isActive) {
          throw new AuthError("ACCOUNT_INACTIVE", "Account is not active", 403);
        }
        // Enforce mandatory password change (audit round 3): a user flagged
        // password_must_change may only reach a small allowlist of
        // self-service auth routes until the password is changed.
        const PASSWORD_CHANGE_ALLOWLIST = new Set([
          "/api/auth/change-password",
          "/api/auth/logout",
          "/api/auth/logout-all",
          "/api/auth/session",
        ]);
        if (
          auth.passwordMustChange &&
          !PASSWORD_CHANGE_ALLOWLIST.has(req.nextUrl.pathname)
        ) {
          throw new AuthError("PASSWORD_CHANGE_REQUIRED", "Change your password to continue.", 403);
        }
        if (effectiveRequiredRole) {
          const allowed = Array.isArray(effectiveRequiredRole)
            ? effectiveRequiredRole
            : [effectiveRequiredRole];
          const callerRoles = auth.roles && auth.roles.length ? auth.roles : [auth.role];
          const ok = allowed.some((r) => callerRoles.includes(r));
          if (!ok) {
            throw new AuthError("FORBIDDEN", "Insufficient role", 403);
          }
        }
        if (options.requiredPermission) {
          await requireAuthPermission(bearer(req), options.requiredPermission);
        }
      if (options.resourceType && options.operation) {
        const url = new URL(req.url);
        const resourceId = options.resourceIdParam
          ? url.pathname.split("/").filter(Boolean).pop() || ""
          : "";
        await validateResourceOp(bearer(req), options.resourceType, resourceId, options.operation);
      }
        // Audit issue #2: routes read x-user-id / x-user-role / x-user-email
        // and TRUST them. That is only safe if withAuthorization OVERWRITES
        // those headers from the verified JWT (not from the client) and signs
        // them. Set the full trusted-identity set here so any route that
        // calls requireTrustedHeaders(req) passes the HMAC check.
        const ts = Date.now();
        const sig = signTrustedHeaders(
          {
            userId: auth.userId,
            role: auth.role,
            email: auth.email,
          },
          ts,
        );
        const headers = new Headers(cachedReq.headers);
        // The identity values are authoritative from the verified JWT — any
        // client-supplied versions of these headers are replaced.
        headers.set("x-user-id", auth.userId);
        headers.set("x-user-role", auth.role);
        if (auth.email) headers.set("x-user-email", auth.email);
        else headers.delete("x-user-email");
        headers.set("x-mw-signature", sig);
        headers.set("x-mw-timestamp", String(ts));
        // Legacy header some routes still read — keep it in sync.
        headers.set("x-auth-signature", sig);
        // Forward the body only when the original request actually had one.
        // `bodyHash !== null` is the authoritative signal: setupBodyCaching
        // returns hash: null for bodyless requests (see the `if (!raw)`
        // branch in body-cache.ts), and only builds a re-wrapped request with
        // a real body stream when the request carried one. Guarding on
        // `cachedReq.body` directly is unreliable because NextRequest.body can
        // be a non-null (already-consumed) stream object even when there is no
        // real payload to forward.
        const proxied =
          bodyHash !== null
            ? new NextRequest(cachedReq.url, {
                method: cachedReq.method,
                headers,
                body: cachedReq.body,
                duplex: "half",
              })
            : new NextRequest(cachedReq.url, {
                method: cachedReq.method,
                headers,
              });
        return await handler(proxied, { auth });
      } catch (err) {
        return handleAuthError(err);
      }
    });
  };
}

export type AuthenticatedRouteHandler = (
  req: NextRequest,
  context: { auth: AuthContext }
) => Promise<Response>;

export function combineMiddleware(
  handler: AuthenticatedRouteHandler,
  ...middlewares: ((h: AuthenticatedRouteHandler) => AuthenticatedRouteHandler)[]
) {
  return middlewares.reduceRight((h, mw) => mw(h), handler);
}

export function requireRole(requiredRole: Role | Role[]) {
  return (handler: AuthenticatedRouteHandler) => withAuthorization(handler, { requiredRole });
}

export function requirePermission(requiredPermission: string) {
  return (handler: AuthenticatedRouteHandler) => withAuthorization(handler, { requiredPermission });
}

export function withAccountStatusValidation(handler: AuthenticatedRouteHandler) {
  return async (req: NextRequest, ctx: { auth: AuthContext }) => {
    if (!ctx.auth.isActive) {
      throw new AuthError("ACCOUNT_INACTIVE", "Account is not active", 403);
    }
    return handler(req, ctx);
  };
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthContext | null> {
  try {
    return await requireAuthUser(bearer(req));
  } catch {
    return null;
  }
}

export async function logAuditEvent(
  eventType: string,
  userId: string,
  details: unknown,
  ipAddress: string | null = null,
  userRole: string | null = null,
  userName: string | null = null
) {
  await query(
    `INSERT INTO audit_logs (id, action, user_id, user_name, user_role, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), eventType, userId, userName, userRole, JSON.stringify(details), ipAddress]
  );
}

export { getGateStudentInfo, getRequestBody };
export type { AuthContext };
export default withAuthorization;
