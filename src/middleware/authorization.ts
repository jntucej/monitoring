/**
 * Centralized Authorization Middleware for Gate Monitoring System
 *
 * `withAuthorization` is the SINGLE validation point per request:
 * it authenticates the Supabase access token exactly once, enforces account
 * status / role / permission / resource rules, and injects the trusted
 * identity headers (`x-user-id`, `x-user-role`, `x-user-email`) consumed by
 * route handlers. Handlers downstream MUST read identity only from these
 * headers — they are always overwritten here from server-validated data,
 * so client-supplied values can never spoof identity.
 *
 * NOTE: Routes no longer need to wrap this in `withAuthAndStatus`; doing so
 * would duplicate the Supabase round-trips per request.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { randomUUID } from "crypto";
import type { Role } from "@/lib/types";
import {
  requireAuthenticatedUser as requireAuthUser,
  requirePermission as requireAuthPermission,
  validateResourceOperation as validateResourceOp,
  getGateStudentInfo,
  isMfaRequiredForAdmin,
  type AuthContext,
} from "@/lib/authContext";

/**
 * Authorization middleware that validates:
 * - Token validity using Supabase Auth (single validation per request)
 * - User existence in public.users
 * - User account status (must be ACTIVE unless allowInactive)
 * - User role and permissions
 * - Resource access
 *
 * @param handler - The API route handler; receives (req, { auth: AuthContext })
 * @param options - Authorization options
 */
export interface AuthorizationOptions {
  requiredRole?: Role | Role[];
  requiredPermission?: string;
  allowInactive?: boolean;
  resourceType?: string;
  resourceIdParam?: string;
  operation?: string;
  /** Set false for pre-MFA endpoints (2fa setup/verify/disable) so enrollment stays reachable. Default true. */
  enforceMfa?: boolean;
}

export function withAuthorization(
  handler: (req: NextRequest, context: { auth: AuthContext }) => Promise<Response>,
  options: AuthorizationOptions = {}
) {
  return async (req: NextRequest) => {
    try {
      // Extract token from authorization header, cookies, or session header
      const authHeader = req.headers.get('authorization');
      let token: string | undefined;

      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else {
        token =
          req.cookies.get('access_token')?.value ||
          req.cookies.get('session-token')?.value ||
          req.headers.get('x-session-token') ||
          undefined;
      }

      if (!token) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }

      // Validate basic authentication
      const authContext = await requireAuthUser(token);

      // Check account status - must be ACTIVE unless explicitly allowed
      if (!options.allowInactive && !authContext.isActive) {
        return NextResponse.json(
          { success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
          { status: 403 }
        );
      }

      // Check if user has the required role
      if (options.requiredRole) {
        const requiredRoles = Array.isArray(options.requiredRole)
          ? options.requiredRole
          : [options.requiredRole];

        if (!requiredRoles.includes(authContext.role)) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
            { status: 403 }
          );
        }
      }

      // MFA gate: sysadmin/admin must have 2FA enrolled when required.
      // Per-user enforcement (twoFactorEnabled), not a global on/off.
      // Skipped when enforceMfa === false (pre-MFA enrollment endpoints).
      if (options.enforceMfa !== false) {
        const mfaRequired = await isMfaRequiredForAdmin();
        if (
          mfaRequired &&
          (authContext.role === 'sysadmin' || authContext.role === 'admin') &&
          !authContext.twoFactorEnabled
        ) {
          throw new Error(
            'MFA_REQUIRED: administrator accounts must enable two-factor authentication'
          );
        }
      }

      // Check if user has the required permission
      if (options.requiredPermission) {
        await requireAuthPermission(token, options.requiredPermission);
      }

      // Validate resource access if specified.
      // Body inspection is limited to body-bearing methods and uses a clone,
      // so GET requests are untouched and handlers can still call req.json().
      if (options.resourceType && options.resourceIdParam) {
        let resourceId: string | undefined;

        if (req.nextUrl.searchParams.has(options.resourceIdParam)) {
          resourceId = req.nextUrl.searchParams.get(options.resourceIdParam) || undefined;
        } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          try {
            const body = await req.clone().json();
            if (body && typeof body === 'object' && options.resourceIdParam in body) {
              resourceId = body[options.resourceIdParam];
            }
          } catch {
            // Ignore body parsing errors
          }
        }

        if (resourceId) {
          await validateResourceOp(
            token,
            options.resourceType,
            resourceId,
            options.operation || 'read'
          );
        }
      }

      // Inject trusted identity headers for the handler. These ALWAYS
      // overwrite client-supplied values with server-validated data.
      req.headers.set('x-user-id', authContext.userId);
      req.headers.set('x-user-role', authContext.role);
      req.headers.set('x-user-email', authContext.email);

      // If all checks pass, continue to the handler with auth context
      return handler(req, { auth: authContext });
    } catch (error) {
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('UNAUTHORIZED')) {
          return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
          );
        } else if (error.message.includes('ACCOUNT_INACTIVE')) {
          return NextResponse.json(
            { success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
            { status: 403 }
          );
        } else if (error.message.includes('MFA_REQUIRED')) {
          return NextResponse.json(
            { success: false, error: { code: 'MFA_REQUIRED', message: 'Two-factor authentication enrollment is required for administrator accounts.' } },
            { status: 403 }
          );
        } else if (error.message.includes('FORBIDDEN')) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
            { status: 403 }
          );
        } else if (error.message.includes('NOT_FOUND')) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } },
            { status: 404 }
          );
        }
      }

      // Default error response
      console.error('Authorization middleware error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Authorization failed' } },
        { status: 500 }
      );
    }
  };
}

/**
 * Pre-MFA authorization wrapper: identical to withAuthorization but skips the
 * MFA gate (enforceMfa: false). ONLY for 2FA enrollment/recovery endpoints
 * (setup / verify / disable / authenticate) so a sysadmin who has not enrolled
 * yet — or lost their device — can always reach them (Issue #5 lockout trap).
 */
export function withAuthorizationPreMfa(
  handler: (req: NextRequest, context: { auth: AuthContext }) => Promise<Response>,
  options: Omit<AuthorizationOptions, "enforceMfa"> = {}
) {
  return withAuthorization(handler, { ...options, enforceMfa: false });
}

export type AuthenticatedRouteHandler = (req: NextRequest, context: { auth: AuthContext }) => Promise<Response>;

/**
 * Higher-order function to combine multiple middleware
 */
export function combineMiddleware(
  handler: AuthenticatedRouteHandler,
  ...middlewares: ((handler: AuthenticatedRouteHandler) => AuthenticatedRouteHandler)[]
) {
  return middlewares.reduceRight(
    (acc, middleware) => middleware(acc),
    handler
  );
}

/**
 * Role-based access control helper
 */
export function requireRole(requiredRole: Role | Role[]) {
  return (handler: AuthenticatedRouteHandler) => {
    return withAuthorization(handler, { requiredRole });
  };
}

/**
 * Permission-based access control helper
 */
export function requirePermission(requiredPermission: string) {
  return (handler: AuthenticatedRouteHandler) => {
    return withAuthorization(handler, { requiredPermission });
  };
}

/**
 * Middleware to validate account status on every request
 */
export function withAccountStatusValidation(handler: AuthenticatedRouteHandler) {
  return withAuthorization(handler, { allowInactive: false });
}

/**
 * Middleware to validate resource access
 */
export function withResourceValidation(
  resourceType: string,
  resourceIdParam: string,
  operation: string = 'read'
) {
  return (handler: AuthenticatedRouteHandler) => {
    return withAuthorization(handler, { resourceType, resourceIdParam, operation });
  };
}

/**
 * Helper function to extract and validate user from request
 */
export async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  const token = authHeader.slice(7);
  return await requireAuthUser(token);
}

/**
 * Helper function to validate student access
 */
export async function validateStudent(req: NextRequest, studentId: string) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  const token = authHeader.slice(7);
  return await validateResourceOp(token, 'student', studentId, 'read');
}

/**
 * Helper function to validate gate access
 */
export async function validateGate(req: NextRequest, gateId: string) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  const token = authHeader.slice(7);
  return await validateResourceOp(token, 'gate', gateId, 'read');
}

/**
 * Helper function to get gate student information
 */
export async function getGateStudent(req: NextRequest, roll: string) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  const token = authHeader.slice(7);
  return await getGateStudentInfo(token, roll);
}

/**
 * Audit logging helper
 */
export async function logAuditEvent(
  eventType: string,
  userId: string,
  details: unknown,
  ipAddress: string | null = null
) {
  try {
    await query(
      `INSERT INTO audit_logs (id, event_type, user_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        randomUUID(),
        eventType,
        userId,
        typeof details === "object" ? JSON.stringify(details) : details,
        ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
}
export default withAuthorization;
