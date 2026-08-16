/**
 * Centralized Authorization Middleware for Gate Monitoring System
 *
 * This middleware provides consistent authorization checks across all API routes.
 * It validates user roles, permissions, and account status on every request.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { Role, AccountStatus } from "@/lib/types";
import {
  requireAuthenticatedUser as requireAuthUser,
  requireRole as requireAuthRole,
  requirePermission as requireAuthPermission,
  validateResourceOperation as validateResourceOp,
  getGateStudentInfo
} from "@/lib/authContext";

/**
 * Authorization middleware that validates:
 * - User account status (must be ACTIVE)
 * - User role and permissions
 * - Resource access
 *
 * @param handler - The API route handler
 * @param options - Authorization options
 * @returns NextResponse with appropriate error or continues to handler
 */
export function withAuthorization(
  handler: (req: NextRequest, context: { auth: any }) => Promise<Response>,
  options: {
    requiredRole?: Role | Role[];
    requiredPermission?: string;
    allowInactive?: boolean;
    resourceType?: string;
    resourceIdParam?: string;
    operation?: string;
  } = {}
) {
  return async (req: NextRequest) => {
    try {
      // Extract token from authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }

      const token = authHeader.slice(7);

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

      // Check if user has the required permission
      if (options.requiredPermission) {
        await requireAuthPermission(token, options.requiredPermission);
      }

      // Validate resource access if specified
      if (options.resourceType && options.resourceIdParam) {
        let resourceId: string | undefined;

        // Try to get resource ID from different sources
        if (req.nextUrl.searchParams.has(options.resourceIdParam)) {
          resourceId = req.nextUrl.searchParams.get(options.resourceIdParam) || undefined;
        } else {
          // For POST/PUT requests, try to parse the body
          try {
            const body = await req.json();
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
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Authorization failed' } },
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function to combine multiple middleware
 */
export function combineMiddleware(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  ...middlewares: ((handler: (req: NextRequest, context?: any) => Promise<Response>) => (req: NextRequest) => Promise<Response>)[]
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
  return (handler: (req: NextRequest, context?: any) => Promise<Response>) => {
    return withAuthorization(handler, { requiredRole });
  };
}

/**
 * Permission-based access control helper
 */
export function requirePermission(requiredPermission: string) {
  return (handler: (req: NextRequest, context?: any) => Promise<Response>) => {
    return withAuthorization(handler, { requiredPermission });
  };
}

/**
 * Middleware to validate account status on every request
 */
export function withAccountStatusValidation(handler: (req: NextRequest, context?: any) => Promise<Response>) {
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
  return (handler: (req: NextRequest, context?: any) => Promise<Response>) => {
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
  details: any,
  ipAddress: string | null = null
) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        event_type: eventType,
        user_id: userId,
        details: details,
        ip_address: ipAddress,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
}