/* eslint-disable */
/**
 * Centralized Authentication Context for Gate Monitoring System
 *
 * This module provides a secure, server-side authentication context that:
 * - Derives identity from trusted Supabase session
 * - Validates account status
 * - Provides role-based authorization
 * - Prevents client-side identity spoofing
 */

import { supabase, getSupabaseServiceClient } from './dbClient';
import { Role, AccountStatus } from './types';
import { getCached, setCached } from './cache';
import { verifyAccessToken } from './auth-token';
import { query } from './postgres';

/**
 * Authenticated User Context
 *
 * Contains all trusted identity information derived from:
 * 1. Supabase session token
 * 2. Database lookup
 * 3. Server-side validation
 */
export interface AuthContext {
  /** The authenticated user ID from Supabase session */
  authUserId: string;

  /** The user ID from public.users table (should match authUserId) */
  userId: string;

  /** The user's role from public.users table */
  role: Role;

  /** The user's account status from public.users table */
  status: AccountStatus;

  /** The user's email from public.users table */
  email: string;

  /** The user's login identifier (employee ID, roll number, etc.) */
  loginIdentifier?: string;

  /** The user's gate ID (for operators) */
  gateId?: string;

  /** The user's department ID (for HOD/faculty/warden scoping) */
  departmentId?: string;

  /** The user's employee ID (for staff) */
  employeeId?: string;

  /** Whether the user is authenticated */
  isAuthenticated: boolean;

  /** Whether the user has an active account */
  isActive: boolean;

  /** The user's active session handle/token for single-session enforcement */
  handle?: string;

  /** Whether the user has 2FA enabled */
  twoFactorEnabled: boolean;
}

/**
 * Whether administrators (sysadmin/admin) must have TOTP 2FA enrolled.
 * Read from system_config.global_settings.mfaRequiredForAdmin (cached 60s).
 *
 * Env override MFA_REQUIRED_FOR_ADMIN=true|false always wins (ops break-glass
 * knob that does not depend on the DB).
 *
 * On DB-read failure: FAIL-CLOSED (default true) and log loudly.
 * If MFA configuration cannot be verified, access requires MFA for safety.
 * Operations can override via MFA_REQUIRED_FOR_ADMIN environment variable.
 */
export async function isMfaRequiredForAdmin(): Promise<boolean> {
  const cached = await getCached<boolean>("system_config:mfaRequiredForAdmin");
  if (cached !== null) return cached;

  // Env override always wins — allows ops to toggle MFA without touching the DB
  if (process.env.MFA_REQUIRED_FOR_ADMIN === "false") {
    await setCached("system_config:mfaRequiredForAdmin", false, 60);
    return false;
  }
  if (process.env.MFA_REQUIRED_FOR_ADMIN === "true") {
    await setCached("system_config:mfaRequiredForAdmin", true, 60);
    return true;
  }

  try {
    const service = getSupabaseServiceClient();
    const { data, error } = await service
      .from("system_config")
      .select("data")
      .eq("key", "global_settings")
      .maybeSingle();
    if (error) throw error;
    const required = !!((data?.data ?? (data as any)?.value) as any)?.mfaRequiredForAdmin;
    await setCached("system_config:mfaRequiredForAdmin", required, 60);
    return required;
  } catch (err) {
    // FAIL CLOSED: assume MFA is required when we cannot verify.
    console.error("[auth] MFA config unreadable — failing closed (MFA required)", err);
    // Do NOT cache — allow retry on next request.
    return true;
  }
}

/**
 * Create an authenticated context from a Supabase session token
 *
 * @param token - Supabase access token
 * @returns AuthContext with validated user information
 */
export async function createAuthContext(token: string): Promise<AuthContext> {
  // Validate token using self-hosted JWT verification
  let userId: string | null = null;
  const payload = await verifyAccessToken(token);
  if (payload && payload.sub) {
    userId = payload.sub;
  } else {
    // Fallback attempt with Supabase auth for backwards compatibility if needed
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    } catch {
      // ignore fallback error
    }
  }

  if (!userId) {
    throw new Error('UNAUTHORIZED: Invalid or expired token');
  }

  // Get user profile from PostgreSQL users table
  const userRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
  if (userRes.rows.length === 0) {
    throw new Error('UNAUTHORIZED: User profile not found');
  }

  const profile = userRes.rows[0];

  // Invalidate JWT tokens if session_version has been incremented
  if (
    payload &&
    typeof (payload as any).session_version === 'number' &&
    typeof profile.session_version === 'number' &&
    (payload as any).session_version !== profile.session_version
  ) {
    throw new Error('UNAUTHORIZED: Session invalidated');
  }

  // NOTE (Issue #5): the MFA gate was removed from here — it's the wrong layer.
  // This context creation must never fail on MFA state, otherwise the
  // enrollment endpoints themselves become unreachable (lockout trap).
  // Enforcement now lives in `withAuthorization` (middleware) and at login.

  // Return the validated context
  return {
    authUserId: userId || profile.id,
    userId: profile.id,
    role: profile.role as Role,
    status: profile.status as AccountStatus,
    email: profile.email,
    loginIdentifier: profile.unique_id || profile.login_identifier,
    gateId: profile.gate_id,
    departmentId: profile.department_id ?? undefined,
    employeeId: profile.unique_id || profile.employee_id,
    isAuthenticated: true,
    isActive: profile.status === 'ACTIVE',
    handle: profile.handle || undefined,
    twoFactorEnabled: profile.two_factor_enabled === true
  };
}

/**
 * Require an authenticated user with active status
 *
 * @param token - Supabase access token
 * @returns AuthContext with validated user information
 * @throws Error if user is not authenticated or not active
 */
export async function requireAuthenticatedUser(token: string): Promise<AuthContext> {
  const context = await createAuthContext(token);

  if (!context.isAuthenticated) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  if (!context.isActive) {
    throw new Error('ACCOUNT_INACTIVE: Account is not active');
  }

  return context;
}

/**
 * Require a specific role for authorization
 *
 * @param token - Supabase access token
 * @param requiredRole - The required role or roles
 * @returns AuthContext with validated user information
 * @throws Error if user doesn't have the required role
 */
export async function requireRole(token: string, requiredRole: Role | Role[]): Promise<AuthContext> {
  const context = await requireAuthenticatedUser(token);
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!requiredRoles.includes(context.role)) {
    throw new Error('FORBIDDEN: Insufficient permissions');
  }

  return context;
}

/**
 * Require any of the specified roles for authorization
 *
 * @param token - Supabase access token
 * @param requiredRoles - Array of acceptable roles
 * @returns AuthContext with validated user information
 * @throws Error if user doesn't have any of the required roles
 */
export async function requireAnyRole(token: string, requiredRoles: Role[]): Promise<AuthContext> {
  return requireRole(token, requiredRoles);
}

/**
 * Require a specific permission (placeholder for future permission system)
 *
 * @param token - Supabase access token
 * @param permission - The required permission
 * @returns AuthContext with validated user information
 * @throws Error if user doesn't have the required permission
 */
export async function requirePermission(token: string, permission: string): Promise<AuthContext> {
  // For now, we'll just check if the user is an admin or system admin
  // In the future, this would check a proper permission system
  const context = await requireAuthenticatedUser(token);

  if (context.role !== 'admin' && context.role !== 'sysadmin') {
    throw new Error('FORBIDDEN: Insufficient permissions');
  }

  return context;
}

/**
 * Validate that a user can access a specific student
 *
 * @param token - Supabase access token
 * @param studentId - The student ID to validate
 * @returns AuthContext with validated user information
 * @throws Error if user cannot access the student
 */
export async function validateStudentAccess(token: string, studentId: string): Promise<AuthContext> {
  const context = await requireAuthenticatedUser(token);

  // Check if the user is the student themselves
  if (context.role === 'student' && context.userId === studentId) {
    return context;
  }

  // Check if the user is a parent accessing their child
  if (context.role === 'parent') {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('guardian_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error('FORBIDDEN: Student not found');
    }

    if (student.guardian_id !== context.userId) {
      throw new Error('FORBIDDEN: Not your child');
    }

    return context;
  }

  // Operators can only access students for gate verification
  if (context.role === 'operator') {
    // Operators can access minimal student information for gate verification
    // This would be validated at the API level
    return context;
  }

  // Admins and system admins can access students based on RLS
  if (['admin', 'sysadmin', 'warden'].includes(context.role)) {
    return context;
  }

  throw new Error('FORBIDDEN: Insufficient permissions');
}

/**
 * Validate that a user can access a specific gate
 *
 * @param token - Supabase access token
 * @param gateId - The gate ID to validate
 * @returns AuthContext with validated user information
 * @throws Error if user cannot access the gate
 */
export async function validateGateAccess(token: string, gateId: string): Promise<AuthContext> {
  const context = await requireAuthenticatedUser(token);

  // Operators can only access gates they're assigned to
  if (context.role === 'operator') {
    if (!context.gateId || context.gateId !== gateId) {
      throw new Error('FORBIDDEN: Not assigned to this gate');
    }
  }


  // Admins and system admins can access all gates
  if (['admin', 'sysadmin'].includes(context.role)) {
    return context;
  }

  return context;
}

/**
 * Validate that a user can perform an operation on a specific resource
 *
 * @param token - Supabase access token
 * @param resourceType - The type of resource (user, student, gate, etc.)
 * @param resourceId - The ID of the resource
 * @param operation - The operation to perform (read, update, delete, etc.)
 * @returns AuthContext with validated user information
 * @throws Error if user cannot perform the operation
 */
export async function validateResourceOperation(
  token: string,
  resourceType: string,
  resourceId: string,
  operation: string
): Promise<AuthContext> {
  const context = await requireAuthenticatedUser(token);

  switch (resourceType) {
    case 'user':
      return validateUserOperation(context, resourceId, operation);
    case 'student':
      return validateStudentAccess(token, resourceId);
    case 'gate':
      return validateGateAccess(token, resourceId);
    case 'pass':
      return validatePassOperation(token, resourceId, operation);
    case 'log':
      return validateLogOperation(token, resourceId, operation);
    default:
      throw new Error('FORBIDDEN: Invalid resource type');
  }
}

/**
 * Validate user operations
 */
async function validateUserOperation(
  context: AuthContext,
  userId: string,
  operation: string
): Promise<AuthContext> {
  // Users can access their own information
  if (context.userId === userId) {
    // Users can only perform certain operations on themselves
    if (operation === 'update' && context.role !== 'admin' && context.role !== 'sysadmin') {
      return context;
    }
    if (operation === 'read') {
      return context;
    }
  }

  // Admins and system admins can perform operations on other users
  if (['admin', 'sysadmin'].includes(context.role)) {
    // System admins can update roles
    if (operation === 'role:update' && context.role !== 'sysadmin') {
      throw new Error('FORBIDDEN: Only system admins can update roles');
    }
    return context;
  }

  throw new Error('FORBIDDEN: Insufficient permissions');
}

/**
 * Validate pass operations
 */
async function validatePassOperation(
  token: string,
  passId: string,
  operation: string
): Promise<AuthContext> {
  const context = await requireAuthenticatedUser(token);

  // Get the pass to validate ownership
  const { data: pass, error: passError } = await supabase
    .from('gate_passes')
    .select('student_id')
    .eq('id', passId)
    .single();

  if (passError || !pass) {
    throw new Error('NOT_FOUND: Pass not found');
  }

  // Students can access their own passes
  if (context.role === 'student') {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('id', context.userId)
      .single();

    if (studentError || !student) {
      throw new Error('FORBIDDEN: Student not found');
    }

    if (student.id !== pass.student_id) {
      throw new Error('FORBIDDEN: Not your pass');
    }

    return context;
  }

  // Parents can access their children's passes
  if (context.role === 'parent') {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, guardian_id')
      .eq('id', pass.student_id)
      .single();

    if (studentError || !student) {
      throw new Error('FORBIDDEN: Student not found');
    }

    if (student.guardian_id !== context.userId) {
      throw new Error('FORBIDDEN: Not your child');
    }

    return context;
  }

  // Admins and system admins can access passes based on RLS
  if (['admin', 'sysadmin'].includes(context.role)) {
    return context;
  }

  throw new Error('FORBIDDEN: Insufficient permissions');
}

/**
 * Validate log operations
 */
async function validateLogOperation(
  token: string,
  logId: string,
  operation: string
): Promise<AuthContext> {
  const context = await requireAuthenticatedUser(token);

  // Get the log to validate access
  const { data: log, error: logError } = await supabase
    .from('movement_logs')
    .select('gate_id, operator_id')
    .eq('id', logId)
    .single();

  if (logError || !log) {
    throw new Error('NOT_FOUND: Log not found');
  }

  // Operators can only access logs for gates they're assigned to
  if (context.role === 'operator') {
    if (!context.gateId || context.gateId !== log.gate_id) {
      throw new Error('FORBIDDEN: Not assigned to this gate');
    }
    return context;
  }


  // Admins and system admins can access all logs
  if (['admin', 'sysadmin'].includes(context.role)) {
    return context;
  }

  throw new Error('FORBIDDEN: Insufficient permissions');
}

/**
 * Get minimal student information for gate verification
 *
 * @param token - Supabase access token
 * @param roll - Student roll number
 * @returns Minimal student information for gate verification
 */
export async function getGateStudentInfo(token: string, roll: string) {
  const context = await requireRole(token, ['operator', 'admin']);

  const formattedId = roll.trim().toUpperCase();

  // 1. Query users table with student_details
  const { data: userRecord } = await supabase
    .from('users')
    .select('*')
    .or(`unique_id.eq.${formattedId},id.eq.${formattedId}`)
    .maybeSingle();

  if (userRecord) {
    if (userRecord.status && userRecord.status.toLowerCase() !== 'active') {
      throw new Error('INACTIVE_STUDENT: User account is not active');
    }
    const { data: sDetailsData } = await supabase
      .from('student_details')
      .select('*')
      .eq('user_id', userRecord.id)
      .maybeSingle();
    const sDetails = sDetailsData || {};
    return {
      id: userRecord.id,
      roll: userRecord.unique_id,
      uniqueId: userRecord.unique_id,
      name: userRecord.name,
      fullName: userRecord.name,
      personType: userRecord.role || 'student',
      department: sDetails.department_id || userRecord.department_id,
      year: sDetails.year,
      section: sDetails.section,
      photo: userRecord.photo_url,
      hostelBlock: sDetails.hostel_block,
      roomNumber: sDetails.room_number,
    };
  }

  // 2. Fallback legacy students table
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, roll, name, department, year, section, photo, status, hostel_block, room_number')
    .eq('roll', formattedId)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error('NOT_FOUND: Student/Person not found');
  }

  if (student.status && student.status.toUpperCase() !== 'ACTIVE') {
    throw new Error('INACTIVE_STUDENT: Student account is not active');
  }

  return {
    id: student.id,
    roll: student.roll,
    uniqueId: student.roll,
    name: student.name,
    fullName: student.name,
    personType: 'student',
    department: student.department,
    year: student.year,
    section: student.section,
    photo: student.photo,
    hostelBlock: student.hostel_block,
    roomNumber: student.room_number
  };
}
