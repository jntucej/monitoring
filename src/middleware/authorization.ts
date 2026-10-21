import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { randomUUID } from "crypto";
import type { Role } from "@/lib/types";
import {
  requireAuthenticatedUser as requireAuthUser,
  requirePermission as requireAuthPermission,
  validateResourceOperation as validateResourceOp,
  getGateStudentInfo,
  isMfaRequiredForPrivileged,
  type AuthContext,
} from "@/lib/authContext";
import { isPrivileged } from "@/lib/roles";
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
  enforceMfa?: boolean;
}

function resolveEnforceMfa(options: AuthorizationOptions): boolean {
  if (options.enforceMfa !== undefined) return options.enforceMfa;
  if (!options.requiredRole) return false;
  return Array.isArray(options.requiredRole)
    ? options.requiredRole.some(isPrivileged)
    : isPrivileged(options.requiredRole);
}

function bearer(req: NextRequest): string {
  return req.headers.get("authorization") || "";
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
  const enforceMfa = resolveEnforceMfa(options);
  return async (req: NextRequest): Promise<Response> => {
    return metricsMiddleware(req, async () => {
      await setupBodyCaching(req);
      try {
        const auth = await requireAuthUser(bearer(req));
        if (!options.allowInactive && !auth.isActive) {
          throw new AuthError("ACCOUNT_INACTIVE", "Account is not active", 403);
        }
        if (options.requiredRole) {
          const allowed = Array.isArray(options.requiredRole)
            ? options.requiredRole
            : [options.requiredRole];
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
      if (enforceMfa) {
          const required = await isMfaRequiredForPrivileged();
          if (required && !auth.twoFactorEnabled) {
            throw new AuthError("MFA_REQUIRED", "MFA required for this action", 403);
          }
        }
        const sig = signTrustedHeaders({
          userId: auth.userId,
          role: auth.role,
          email: auth.email,
        });
        const headers = new Headers(req.headers);
        headers.set("x-auth-signature", sig);
        const proxied = new NextRequest(req.url, {
          method: req.method,
          headers,
          body: req.body,
          duplex: "half",
        });
        return await handler(proxied, { auth });
      } catch (err) {
        return handleAuthError(err);
      }
    });
  };
}

export function withAuthorizationPreMfa(
  handler: (req: NextRequest, context: { auth: AuthContext }) => Promise<Response>,
  options: Omit<AuthorizationOptions, "enforceMfa"> = {}
) {
  return withAuthorization(handler, { ...options, enforceMfa: false });
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
