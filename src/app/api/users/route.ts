import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUserRole, updateAccountStatus } from "@/lib/db";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/users - List all users (admin only)
 */
async function handleGet(req: NextRequest) {
  // Extract user information from headers
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId || !userRole) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // Only admin and sysadmin can list users
  if (userRole !== 'admin' && userRole !== 'sysadmin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only administrators can list users' } },
      { status: 403 }
    );
  }

  try {
    const { findAllUsers } = await import("@/lib/db");
    const users = await findAllUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list users" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Create a new user (admin only)
 */
async function handlePost(req: NextRequest) {
  // Extract user information from headers
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId || !userRole) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // Only admin and sysadmin can create users
  if (userRole !== 'admin' && userRole !== 'sysadmin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only administrators can create users' } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, role, status = 'ACTIVE' } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Name, email, and role are required" } },
        { status: 400 }
      );
    }

    // Validate role and prevent privilege escalation
    const validRoles = ['admin', 'supervisor', 'operator', 'parent', 'student', 'sysadmin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROLE", message: "Invalid role specified" } },
        { status: 400 }
      );
    }

    // Rule: An admin cannot create a sysadmin.
    if (userRole === 'admin' && role === 'sysadmin') {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrators cannot create system administrators." } },
        { status: 403 }
      );
    }

    // Validate status
    const validStatuses = ['ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED', 'DEPROVISIONED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATUS", message: "Invalid status specified" } },
        { status: 400 }
      );
    }

    const { createUser } = await import("@/lib/db");
    // Pass the creator's ID for audit logging
    const user = await createUser({ name, email, role, status });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "CREATE_FAILED", message: "Failed to create user" } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create user" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id] - Update user (admin only)
 */
async function handlePatch(req: NextRequest) {
  // Extract user information from headers
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role');

  if (!userId || !userRole) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // Only admin and sysadmin can update users
  if (userRole !== 'admin' && userRole !== 'sysadmin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only administrators can update users' } },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const targetUserId = url.pathname.split('/').pop();

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_USER_ID", message: "User ID is required" } },
        { status: 400 }
      );
    }

    // Prevent users from modifying themselves
    if (targetUserId === userId) {
      return NextResponse.json(
        { success: false, error: { code: "SELF_MODIFICATION", message: "Cannot modify your own account" } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { role, status } = body;

    // Check if we're updating role
    if (role !== undefined) {
      // Validate role
      const validRoles = ['admin', 'supervisor', 'operator', 'parent', 'student', 'sysadmin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_ROLE", message: "Invalid role specified" } },
          { status: 400 }
        );
      }

      // Rule: An admin cannot promote another user to sysadmin.
      if (userRole === 'admin' && role === 'sysadmin') {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Administrators cannot grant system administrator privileges." } },
          { status: 403 }
        );
      }

      // Update role and revoke sessions
      const success = await updateUserRole(targetUserId, role, userId);
      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update user role" } },
          { status: 500 }
        );
      }
    }

    // Check if we're updating status
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED', 'DEPROVISIONED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_STATUS", message: "Invalid status specified" } },
          { status: 400 }
        );
      }

      // Update status
      const success = await updateAccountStatus(targetUserId, status);
      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update user status" } },
          { status: 500 }
        );
      }
    }

    // Get the updated user
    const updatedUser = await findUserById(targetUserId);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found after update" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(withAuthAndStatus(withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin'] })), { keyPrefix: 'users_list', maxRequests: 30 });
export const POST = withRateLimit(withAuthAndStatus(withAuthorization(handlePost, { requiredRole: ['admin', 'sysadmin'] })), { keyPrefix: 'users_create', maxRequests: 10 });
export const PATCH = withRateLimit(withAuthAndStatus(withAuthorization(handlePatch, { requiredRole: ['admin', 'sysadmin'] })), { keyPrefix: 'users_update', maxRequests: 20 });
