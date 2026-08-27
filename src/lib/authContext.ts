/**
 * Centralized Authentication Context for Gate Monitoring System
 *
 * This module provides a secure, server-side authentication context that:
 * - Derives identity from trusted Supabase session
 * - Validates account status
 * - Provides role-based authorization
 * - Prevents client-side identity spoofing
 */

import { supabase, getSupabaseServiceClient } from './supabaseClient';
import { Role, AccountStatus } from './types';

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

  /** The user's employee ID (for staff) */
  employeeId?: string;

  /** Whether the user is authenticated */
  isAuthenticated: boolean;

  /** Whether the user has an active account */
  isActive: boolean;

  /** The user's active session handle/token for single-session enforcement */
  handle?: string;
}

/**
 * Create an authenticated context from a Supabase session token
 *
 * @param token - Supabase access token
 * @returns AuthContext with validated user information
 */
export async function createAuthContext(token: string): Promise<AuthContext> {
  // Validate the token with Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: Invalid or expired token');
  }

  // Get the user profile from public.users using the service client to bypass RLS on server-side lookups
  const service = getSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // We have a valid Supabase user but no corresponding profile in our public.users table.
    // This is a critical data integrity issue and should be treated as an auth failure.
    throw new Error('UNAUTHORIZED: User profile not found');
  }

  // Sanity check to ensure the ID from the token matches the profile ID.
  if (profile.id !== user.id) {
    // This should theoretically never happen if the database is consistent.
    throw new Error('UNAUTHORIZED: User ID mismatch');
  }

  // Return the validated context
  return {
    authUserId: user.id,
    userId: profile.id,
    role: profile.role as Role,
    status: profile.status as AccountStatus,
    email: profile.email,
    loginIdentifier: profile.unique_id || profile.login_identifier,
    gateId: profile.gate_id,
    employeeId: profile.unique_id || profile.employee_id,
    isAuthenticated: true,
    isActive: profile.status === 'ACTIVE',
    handle: profile.handle || undefined
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
      .select('parent_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      throw new Error('FORBIDDEN: Student not found');
    }

    if (student.parent_id !== context.userId) {
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
      .select('id, parent_id')
      .eq('id', pass.student_id)
      .single();

    if (studentError || !student) {
      throw new Error('FORBIDDEN: Student not found');
    }

    if (student.parent_id !== context.userId) {
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
    .select('*, student_details(*)')
    .or(`unique_id.eq.${formattedId},id.eq.${formattedId}`)
    .maybeSingle();

  if (userRecord) {
    if (userRecord.status && userRecord.status.toLowerCase() !== 'active') {
      throw new Error('INACTIVE_STUDENT: User account is not active');
    }
    const sDetails = userRecord.student_details || {};
    return {
      id: userRecord.id,
      roll: userRecord.unique_id,
      uniqueId: userRecord.unique_id,
      name: userRecord.name,
      fullName: userRecord.name,
      personType: userRecord.role || 'student',
      department: sDetails.department_id,
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
