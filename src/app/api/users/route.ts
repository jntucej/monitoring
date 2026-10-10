import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import {
  findUserById,
  findAllUsers,
  updateUserRole,
  updateAccountStatus,
  createUser as provisionProfile,
  hashPin,
  addAudit,
} from "@/lib/db";
import type { Role } from "@/lib/types";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { isMfaRequiredForAdmin } from "@/lib/authContext";

// Roles assignable via this API. Intersection of src/lib/types.ts `Role`
// and the CHECK constraint on public.users.role in consolidated_clean_schema.sql.
const VALID_ROLES: Role[] = ['operator', 'admin', 'sysadmin', 'parent', 'student', 'warden'];
const VALID_STATUSES = ['ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED', 'DEPROVISIONED'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/users - List all users (admin/sysadmin only)
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
 * POST /api/users - Provision a new user (admin/sysadmin only)
 *
 * Supabase Auth-first provisioning:
 *  1. Create the identity in Supabase Auth (invite email OR a generated temp
 *     password that is NEVER returned or logged).
 *  2. Insert the matching public.users profile row (FK to auth.users.id).
 *  3. Roll back the Auth user if the profile insert fails.
 */
async function handlePost(req: NextRequest) {
  // Identity headers are injected by withAuthorization from the validated
  // Supabase token — clients cannot forge them.
  const actorId = req.headers.get('x-user-id');
  const actorRole = req.headers.get('x-user-role');

  if (!actorId || !actorRole) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // Only admin and sysadmin can create users
  if (actorRole !== 'admin' && actorRole !== 'sysadmin') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Only administrators can create users' } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const {
      name, role, status = 'ACTIVE',
      employeeId, uniqueId, phone, gateId, parentId, guardianId, supervisedGates,
      assignedHostel, hostelRoom, isHod, departmentId, department, canViewGender,
      loginIdentifier, pin, sendInvite = false,
    } = body || {};

    const effectiveUniqueId = uniqueId || employeeId;
    const effectiveDept = departmentId || department;
    const effectiveHostel = assignedHostel || hostelRoom;

    const rawEmail = body?.email;
    const email = rawEmail || (effectiveUniqueId ? `${effectiveUniqueId.trim().toLowerCase()}@jntuhcej.ac.in` : undefined);

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Name, email, and role are required" } },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_EMAIL", message: "A valid email address is required" } },
        { status: 400 }
      );
    }

    // Validate role and prevent privilege escalation
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROLE", message: "Invalid role specified" } },
        { status: 400 }
      );
    }

    // Rule: An admin cannot create a sysadmin.
    if (actorRole === 'admin' && role === 'sysadmin') {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Administrators cannot create system administrators." } },
        { status: 403 }
      );
    }

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATUS", message: "Invalid status specified" } },
        { status: 400 }
      );
    }

    // Optional secondary PIN for kiosk/gate login (stored bcrypt-hashed)
    if (pin !== undefined && (typeof pin !== "string" || !/^\d{4,8}$/.test(pin))) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PIN", message: "PIN must be 4-8 digits" } },
        { status: 400 }
      );
    }

    const service = getSupabaseServiceClient();

    // ---- Step 1: provision the Supabase Auth identity ----
    let authUserId: string | undefined;
    let inviteSent = false;

    if (sendInvite === true) {
      const { data, error: inviteErr } = await service.auth.admin.inviteUserByEmail(
        String(email).trim(),
        { data: { name: String(name), role: String(role) } }
      );
      if (inviteErr || !data?.user) {
        console.error('Auth invite failed:', inviteErr);
        return NextResponse.json(
          { success: false, error: { code: "AUTH_PROVISION_FAILED", message: "Failed to send user invitation" } },
          { status: 500 }
        );
      }
      authUserId = data.user.id;
      inviteSent = true;
    } else {
      // Generated server-side; never returned to any client nor logged.
      const temporaryPassword = randomBytes(18).toString("base64url");
      const { data, error: createErr } = await service.auth.admin.createUser({
        email: String(email).trim(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { name: String(name), role: String(role), employee_id: effectiveUniqueId ?? null },
      });
      if (createErr || !data?.user) {
        console.error('Auth user creation failed:', createErr);
        return NextResponse.json(
          { success: false, error: { code: "AUTH_PROVISION_FAILED", message: createErr?.message || "Failed to create authentication account" } },
          { status: 500 }
        );
      }
      authUserId = data.user.id;
    }

    // ---- Step 2: insert the public.users profile (matching UUID id) ----
    const user = await provisionProfile({
      id: authUserId,
      name: String(name),
      role: role as Role,
      email: String(email).trim(),
      employeeId: employeeId || undefined,
      uniqueId: effectiveUniqueId || undefined,
      phone: phone || undefined,
      gateId: gateId || undefined,
      parentId: parentId || guardianId || undefined, guardianId: guardianId || parentId || undefined,
      supervisedGates: supervisedGates || undefined,
      assignedHostel: effectiveHostel || undefined,
      hostelRoom: effectiveHostel || undefined,
      isHod: !!isHod,
      departmentId: effectiveDept || undefined,
      canViewGender: canViewGender || undefined,
      status,
      loginIdentifier: loginIdentifier || effectiveUniqueId || String(email).trim(),
      initialPinHash: pin ? await hashPin(pin) : undefined,
    });

    if (!user) {
      // Profile insert failed -> roll back the orphaned Auth identity.
      await service.auth.admin.deleteUser(authUserId).catch((delErr) =>
        console.error('Failed to roll back auth user after profile failure:', delErr)
      );
      return NextResponse.json(
        { success: false, error: { code: "CREATE_FAILED", message: "Failed to create user profile" } },
        { status: 500 }
      );
    }

    // Insert student_details if role is student
    if (role === "student") {
      await service.from("student_details").upsert({
        user_id: user.id || authUserId,
        roll: body.roll || effectiveUniqueId || body.uniqueId || (user as any).unique_id || String(email).split("@")[0],
        year: body.year ?? 1,
        section: body.section ?? "A",
        batch: body.batch ?? "",
        hostel_block: body.hostelBlock ?? effectiveHostel ?? null,
        room_number: body.roomNumber ?? body.hostelRoom ?? null,
        student_type: body.studentType ?? null,
        gender: body.gender ?? null,
        guardian_id: body.guardianId ?? parentId ?? null,
      }, { onConflict: "user_id" });
    }

    // Insert employee_details if role is staff/faculty/operator/admin/sysadmin/worker
    if (["faculty", "staff", "operator", "admin", "sysadmin", "worker"].includes(role)) {
      await service.from("employee_details").upsert({
        user_id: user.id || authUserId,
        employee_id: employeeId || effectiveUniqueId || (user as any).unique_id || String(email).split("@")[0],
        designation: body.designation || (role === "faculty" ? "Assistant Professor" : role),
        department_id: effectiveDept || null,
        is_hod: !!isHod,
        staff_category: body.staffCategory || role,
      }, { onConflict: "user_id" });
    }

    return NextResponse.json({
      success: true,
      data: user,
      meta: { authProvider: 'supabase', inviteSent },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create user" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/<id> - Update a user (admin/sysadmin only)
 *
 * Supported fields:
 *  - role          Role change; revokes all Supabase sessions.
 *  - status        Account status change; revokes all Supabase sessions.
 *  - pin           Reset the secondary kiosk PIN (bcrypt-hashed into
 *                  initial_pin_hash); revokes all Supabase sessions.
 *  - password      Force-set a new Supabase Auth password (admin API);
 *                  revokes all Supabase sessions.
 */
async function handlePatch(req: NextRequest) {
  // Identity headers are injected by withAuthorization from the validated
  // Supabase token — clients cannot forge them.
  const actorId = req.headers.get('x-user-id');
  const actorRole = req.headers.get('x-user-role');

  if (!actorId || !actorRole) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // Only admin and sysadmin can update users
  if (actorRole !== 'admin' && actorRole !== 'sysadmin') {
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
    if (targetUserId === actorId) {
      return NextResponse.json(
        { success: false, error: { code: "SELF_MODIFICATION", message: "Cannot modify your own account" } },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const { role, status, pin, password } = body || {};

    // Check if we're updating role
    if (role !== undefined) {
      // Validate role
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_ROLE", message: "Invalid role specified" } },
          { status: 400 }
        );
      }

      // Rule: An admin cannot promote another user to sysadmin.
      if (actorRole === 'admin' && role === 'sysadmin') {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Administrators cannot grant system administrator privileges." } },
          { status: 403 }
        );
      }

      // Guard: if 2FA-for-admins is required, a newly promoted sysadmin who
      // hasn't enrolled would be locked out of login AND every API route
      // (enrollment itself needs an authenticated session). Block the
      // promotion until they enroll, instead of stranding them.
      if (role === 'sysadmin' && (await isMfaRequiredForAdmin())) {
        const service = getSupabaseServiceClient();
        const { data: targetMfa } = await service
          .from("users")
          .select("two_factor_enabled")
          .eq("id", targetUserId)
          .maybeSingle();
        if (!targetMfa?.two_factor_enabled) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "MFA_REQUIRED",
                message: "This user must enroll in two-factor authentication (Profile → Security) before being promoted to sysadmin.",
              },
            },
            { status: 403 }
          );
        }
      }

      // Update role (also revokes all Supabase Auth sessions)
      const success = await updateUserRole(targetUserId, role as Role, actorId);
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
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_STATUS", message: "Invalid status specified" } },
          { status: 400 }
        );
      }

      // Update status (also revokes all Supabase Auth sessions)
      const success = await updateAccountStatus(targetUserId, status);
      if (!success) {
        return NextResponse.json(
          { success: false, error: { code: "UPDATE_FAILED", message: "Failed to update user status" } },
          { status: 500 }
        );
      }
    }

    // Reset the secondary kiosk PIN (bcrypt-hashed into initial_pin_hash)
    if (pin !== undefined) {
      if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_PIN", message: "PIN must be 4-8 digits" } },
          { status: 400 }
        );
      }

      const initialPinHash = await hashPin(pin);
      const service = getSupabaseServiceClient();
      const { error: pinErr } = await service
        .from("users")
        .update({ initial_pin_hash: initialPinHash })
        .eq("id", targetUserId);

      if (pinErr) {
        console.error('Error resetting PIN:', pinErr);
        return NextResponse.json(
          { success: false, error: { code: "UPDATE_FAILED", message: "Failed to reset PIN" } },
          { status: 500 }
        );
      }

      await addAudit({
        action: 'USER_PIN_RESET',
        userId: actorId,
        userName: 'System',
        role: actorRole as Role,
        details: `Reset kiosk PIN for user ${targetUserId}`,
      });
    }

    // Force-set a new Supabase Auth password via the Admin API
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_PASSWORD", message: "Password must be at least 8 characters" } },
          { status: 400 }
        );
      }

      const service = getSupabaseServiceClient();
      const { error: pwdErr } = await service.auth.admin.updateUserById(targetUserId, {
        password,
      });

      if (pwdErr) {
        console.error('Error resetting password:', pwdErr);
        return NextResponse.json(
          { success: false, error: { code: "UPDATE_FAILED", message: "Failed to reset password" } },
          { status: 500 }
        );
      }

      await addAudit({
        action: 'USER_PASSWORD_RESET',
        userId: actorId,
        userName: 'System',
        role: actorRole as Role,
        details: `Force-reset Supabase Auth password for user ${targetUserId}`,
      });
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

export const GET = withRateLimit(withAuthorization(handleGet, { requiredRole: ['admin', 'sysadmin'] }), { keyPrefix: 'users_list', maxRequests: 30 });
export const POST = withRateLimit(withAuthorization(handlePost, { requiredRole: ['admin', 'sysadmin'] }), { keyPrefix: 'users_create', maxRequests: 10 });
export const PATCH = withRateLimit(withAuthorization(handlePatch, { requiredRole: ['admin', 'sysadmin'] }), { keyPrefix: 'users_update', maxRequests: 20 });
