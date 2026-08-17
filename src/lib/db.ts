import { supabase } from './supabaseClient';
import { randomUUID } from "crypto";
import bcrypt from 'bcryptjs';

import type {
  Department, DepartmentCode, Gate, Student, Scan, ScanDirection, ExitReason,
  GatePass, GatePassStatus, Alert, AlertSeverity, AuditEntry,
  User, DashboardData, Role, AccountStatus,
} from "./types";

/* ------------------------------------------------------------------ *
 *  COLLEGE DATA
 * ------------------------------------------------------------------ */
export const COLLEGE = {
  name: "JNTUH College of Engineering Jagtial (JNTUH CEJ)",
  shortName: "JNTUH CEJ",
  address: "JNTUH College of Engineering Jagtial, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501",
  logo: "🏛️",
  accreditation: "NAAC A+ Grade",
  website: "https://jntuhcej.ac.in/",
  principal: "Dr. G. Narsimha",
};

export async function resolveAlert(alertId: string, userId: string): Promise<boolean> {
  const { data: user } = await supabase.from('users').select('name').eq('id', userId).single();
  const { error } = await supabase
    .from('alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq('id', alertId);

  if (error) {
    console.error('Error resolving alert:', error);
    return false;
  }

  await addAudit({
    action: 'ALERT_RESOLVED',
    userId,
    userName: user?.name ?? 'Unknown',
    role: 'admin',
    details: `Resolved alert ${alertId}`,
  });

  return true;
}

export const DEPARTMENTS: Department[] = [
  { code: "CSE", name: "Computer Science & Engineering", hod: "Dr. K. Sridhar" },
  { code: "IT",  name: "Information Technology",        hod: "Dr. P. Sreedhar" },
  { code: "ECE", name: "Electronics & Communication Engineering", hod: "Dr. M. Srinivas" },
  { code: "EEE", name: "Electrical & Electronics Engineering",    hod: "Dr. K. Ramesh" },
  { code: "ME",  name: "Mechanical Engineering",          hod: "Dr. R. Mahesh" },
];

export const GATES: Gate[] = [
  { id: "gate-1", name: "Gate 1 (Main)",      location: "Main Entrance",    type: "main",   isActive: true },
  { id: "gate-2", name: "Gate 2 (Hostel)",    location: "Hostel Side",      type: "hostel", isActive: true },
  { id: "gate-3", name: "Gate 3 (Back Gate)", location: "Back Side",        type: "back",   isActive: false },
];

type Reason = ExitReason;

/* ------------------------------------------------------------------ *
 *  MAPPERS
 * ------------------------------------------------------------------ */
function mStu(r: any): Student { return { id: r.id, roll: r.roll, name: r.name, department: r.department, year: r.year, section: r.section, batch: r.batch, photo: r.photo, email: r.email, phone: r.phone, parentName: r.parent_name, parentPhone: r.parent_phone, parentId: r.parent_id, qrCode: r.qr_code, idValidUntil: r.id_valid_until, status: r.status }; }
function mUser(r: any): User {
  return {
    id: r.id,
    employeeId: r.employee_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    gateId: r.gate_id || undefined,
    pin: r.pin,
    parentId: r.parent_id || undefined,
    supervisedGates: r.supervised_gates || undefined,
    assignedHostel: r.assigned_hostel || undefined,
    isHod: r.is_hod || undefined,
    departmentId: r.department_id || undefined,
    canViewGender: r.can_view_gender || undefined,
    status: r.status || "ACTIVE"
  };
}
function mScan(r: any): Scan { return { id: r.id, roll: r.roll, name: r.name, department: r.department, year: r.year, direction: r.direction, reason: r.reason, gateId: r.gate_id, gateName: r.gate_name, operatorId: r.operator_id, operatorName: r.operator_name, timestamp: r.timestamp, isManual: !!r.is_manual, isCorrection: !!r.is_correction, originalScanId: r.original_scan_id || undefined }; }
function mPass(r: any): GatePass { return { id: r.id, roll: r.roll, studentName: r.student_name, department: r.department, reason: r.reason, from: r.from_datetime, to: r.to_datetime, description: r.description, requestedById: r.requested_by_id, requestedByName: r.requested_by_name, requestedAt: r.requested_at, parentStatus: r.parent_status, adminStatus: r.admin_status, finalStatus: r.final_status, parentComment: r.parent_comment, adminComment: r.admin_comment, parentApproverId: r.parent_approver_id, adminApproverId: r.admin_approver_id, qrCode: r.qr_code }; }
function mAlert(r: any): Alert { return { id: r.id, severity: r.severity, title: r.title, message: r.message, gateId: r.gate_id, studentRoll: r.student_roll, timestamp: r.timestamp, resolved: !!r.resolved }; }

export async function findPass(passId: string): Promise<GatePass | null> {
  const { data, error } = await supabase
    .from('gate_passes')
    .select('*')
    .eq('id', passId)
    .single();

  if (error || !data) {
    console.error('Error finding pass:', error);
    return null;
  }

  return mPass(data);
}

export async function approvePass(passId: string, role: string, comment: string = "", approverId: string): Promise<boolean> {
  // Determine which status field to update based on role
  const updateField = role === 'parent' ? 'parent_status' : 'admin_status';
  const commentField = role === 'parent' ? 'parent_comment' : 'admin_comment';
  const approverField = role === 'parent' ? 'parent_approver_id' : 'admin_approver_id';

  const statusValue = 'APPROVED';

  // First read the pass to compute new final_status
  const { data: pass, error: readErr } = await supabase
    .from('gate_passes')
    .select('*')
    .eq('id', passId)
    .single();

  if (readErr || !pass) {
    console.error('Error reading pass for approval:', readErr);
    return false;
  }

  const newParentStatus = role === 'parent' ? statusValue : pass.parent_status;
  const newAdminStatus = role === 'admin' ? statusValue : pass.admin_status;
  const finalStatus =
    newParentStatus === 'APPROVED' && newAdminStatus === 'APPROVED'
      ? 'APPROVED'
      : newParentStatus === 'REJECTED' || newAdminStatus === 'REJECTED'
      ? 'REJECTED'
      : newParentStatus === 'APPROVED' || newAdminStatus === 'APPROVED'
      ? (newParentStatus === 'APPROVED' ? 'APPROVED_PARENT' : 'APPROVED_ADMIN')
      : 'PENDING';

  const { error } = await supabase
    .from('gate_passes')
    .update({
      [updateField]: statusValue,
      [commentField]: comment,
      [approverField]: approverId,
      final_status: finalStatus,
    })
    .eq('id', passId);

  if (error) {
    console.error('Error approving pass:', error);
    return false;
  }

  const { data: user } = await supabase.from('users').select('name').eq('id', approverId).single();
  await addAudit({
    action: `GATE_PASS_APPROVED_${role.toUpperCase()}`,
    userId: approverId,
    userName: user?.name ?? 'Unknown',
    role,
    details: `Approved gate pass ${passId}${comment ? ` — ${comment}` : ''}`,
  });

  // Notify student
  const { data: stu } = await supabase.from('students').select('id, parent_id, name').eq('roll', pass.roll).single();
  if (stu) {
    await addNotification(
      'student',
      stu.id,
      'gate_pass',
      'Gate Pass Update',
      `Your gate pass has been ${role === 'parent' ? 'approved by parent' : 'approved by admin'} (${finalStatus}).`
    );
    if (stu.parent_id) {
      await addNotification(
        'parent',
        stu.parent_id,
        'gate_pass',
        'Gate Pass Update',
        `Gate pass for ${stu.name} was ${role === 'parent' ? 'approved by parent' : 'approved by admin'}.`
      );
    }
  }

  return true;
}

export async function rejectPass(passId: string, role: string, comment: string = "", approverId?: string): Promise<boolean> {
  const updateField = role === 'parent' ? 'parent_status' : 'admin_status';
  const commentField = role === 'parent' ? 'parent_comment' : 'admin_comment';
  const approverField = role === 'parent' ? 'parent_approver_id' : 'admin_approver_id';

  const { error } = await supabase
    .from('gate_passes')
    .update({
      [updateField]: 'REJECTED',
      [commentField]: comment,
      [approverField]: approverId,
      final_status: 'REJECTED',
    })
    .eq('id', passId);

  if (error) {
    console.error('Error rejecting pass:', error);
    return false;
  }

  if (approverId) {
    const { data: user } = await supabase.from('users').select('name').eq('id', approverId).single();
    await addAudit({
      action: `GATE_PASS_REJECTED_${role.toUpperCase()}`,
      userId: approverId,
      userName: user?.name ?? 'Unknown',
      role,
      details: `Rejected gate pass ${passId} — ${comment}`,
    });
  }

  return true;
}

export async function createGatePass(passData: {
  roll: string;
  reason: string;
  from: string;
  to: string;
  description?: string;
  requestedById?: string;
  requestedByName?: string;
}): Promise<GatePass | null> {
  // Look up student for derived fields
  const { data: stu, error: stuErr } = await supabase
    .from('students')
    .select('id, name, department, parent_id')
    .eq('roll', passData.roll.trim().toUpperCase())
    .single();

  if (stuErr || !stu) {
    console.error('Student not found for pass creation:', stuErr);
    return null;
  }

  const id = `pass-${randomUUID()}`;
  const qrPayload = JSON.stringify({ id, roll: passData.roll });

  const { data, error } = await supabase
    .from('gate_passes')
    .insert([
      {
        id,
        student_id: stu.id,
        roll: passData.roll.toUpperCase(),
        student_name: stu.name,
        department: stu.department,
        reason: passData.reason,
        from_datetime: passData.from,
        to_datetime: passData.to,
        description: passData.description ?? null,
        requested_by_id: passData.requestedById ?? null,
        requested_by_name: passData.requestedByName ?? null,
        parent_status: 'PENDING',
        admin_status: 'PENDING',
        final_status: 'PENDING',
        qr_code: qrPayload,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating gate pass:', error);
    return null;
  }

  // Notify parent & admin
  if (stu.parent_id) {
    await addNotification(
      'parent',
      stu.parent_id,
      'gate_pass',
      'New Gate Pass Request',
      `${stu.name} requested a gate pass (${passData.reason}) from ${passData.from} to ${passData.to}. Please review.`
    );
  }
  await addNotification(
    'admin',
    'all',
    'gate_pass',
    'New Gate Pass Request',
    `${stu.name} (${passData.roll}) requested a gate pass (${passData.reason}).`
  );

  return mPass(data);
}

export async function findGatePasses(filters: {
  status?: string;
  roll?: string;
  parentId?: string;
  studentId?: string;
} = {}): Promise<GatePass[]> {
  let query = supabase.from('gate_passes').select('*').order('requested_at', { ascending: false });

  if (filters.status) {
    query = query.eq('final_status', filters.status);
  }
  if (filters.roll) {
    query = query.eq('roll', filters.roll.toUpperCase());
  }
  if (filters.parentId) {
    // Filter by parent of the student
    const { data: stu } = await supabase.from('students').select('id').eq('parent_id', filters.parentId);
    const ids = (stu ?? []).map((s: any) => s.id);
    if (ids.length === 0) return [];
    query = query.in('student_id', ids);
  }
  if (filters.studentId) {
    query = query.eq('student_id', filters.studentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error finding gate passes:', error);
    return [];
  }

  return (data ?? []).map(mPass);
}

export async function correctionCandidates(): Promise<Scan[]> {
  // Eligible for correction: scans within the last hour, not already corrected
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .gte('timestamp', oneHourAgo)
    .eq('is_correction', false)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error loading correction candidates:', error);
    return [];
  }

  return (data ?? []).map(mScan);
}

export async function correctScan(originalScanId: string, newDirection: ScanDirection, newReason: ExitReason | undefined, reason: string, userId: string, userName: string, role: string): Promise<Scan | null> {
  // 1. Read the original scan
  const { data: original, error: readErr } = await supabase
    .from('gate_logs')
    .select('*')
    .eq('id', originalScanId)
    .single();

  if (readErr || !original) {
    console.error('Original scan not found:', readErr);
    return null;
  }

  // 2. Reject corrections outside 1-hour window
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if (original.timestamp < oneHourAgo) {
    console.warn('Scan outside correction window');
    return null;
  }

  // 3. Insert a NEW scan row that supersedes the original
  const newId = `scan-${randomUUID()}`;
  const ts = new Date().toISOString();
  const { data: newScan, error: insErr } = await supabase
    .from('gate_logs')
    .insert([
      {
        id: newId,
        student_id: original.student_id,
        roll: original.roll,
        name: original.name,
        department: original.department,
        year: original.year,
        direction: newDirection,
        reason: newReason ?? null,
        gate_id: original.gate_id,
        gate_name: original.gate_name,
        operator_id: userId,
        operator_name: userName,
        timestamp: ts,
        is_manual: 1,
        is_correction: true,
        original_scan_id: originalScanId,
        correction_reason: reason,
      },
    ])
    .select()
    .single();

  if (insErr || !newScan) {
    console.error('Error inserting corrected scan:', insErr);
    return null;
  }

  // 4. Update campus_occupancy to reflect the new direction
  if (original.student_id) {
    await supabase.from('campus_occupancy').upsert(
      {
        student_id: original.student_id,
        current_status: newDirection,
        last_gate_id: original.gate_id,
        last_log_id: newId,
        last_updated: ts,
      },
      { onConflict: 'student_id' }
    );
  }

  // 5. Audit
  await addAudit({
    action: 'SCAN_CORRECTED',
    userId,
    userName,
    role,
    details: `Corrected scan ${originalScanId} (${original.direction} → ${newDirection}). Reason: ${reason}`,
    gateId: original.gate_id,
  });

  return mScan(newScan);
}

export async function getAllGatesLive(): Promise<Gate[]> {
  // Combine persisted gates + activity counts from today's scans
  const gates = await findAllGates();
  const today = await scansToday();

  return gates.map((g) => ({
    ...g,
    // The Gate type from `findAllGates` doesn't include these, but the route extends it
    currentScanCount: today.filter((s) => s.gateId === g.id).length,
    lastScan: today.find((s) => s.gateId === g.id) ?? null,
  })) as any;
}

export async function getAlerts(resolved?: boolean): Promise<Alert[]> {
  let query = supabase.from('alerts').select('*').order('timestamp', { ascending: false });
  if (resolved !== undefined) {
    query = query.eq('resolved', resolved);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error loading alerts:', error);
    return [];
  }
  return (data ?? []).map(mAlert);
}

export async function getNotifications(recipientType: string, recipientId: string): Promise<Alert[]> {
  // 'all' is a wildcard (e.g. for admin broadcast)
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_type', recipientType)
    .order('created_at', { ascending: false })
    .limit(50);

  if (recipientId !== 'all') {
    query = query.eq('recipient_id', recipientId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
  // Re-map to Alert shape (notifications table has no severity/gate/student_roll — use defaults)
  return (data ?? []).map((n: any) => ({
    id: n.id,
    severity: 'info' as AlertSeverity,
    title: n.title,
    message: n.message,
    gateId: undefined,
    studentRoll: undefined,
    timestamp: n.created_at,
    resolved: !!n.read,
  }));
}

export async function getUserForSession(sessionId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('users(*)')
    .eq('id', sessionId)
    .eq('active', true)
    .single();

  if (error || !data) {
    console.error('Error loading session user:', error);
    return null;
  }
  return data.users ? mUser(data.users) : null;
}

export async function createSession(userId: string, token: string, refreshToken: string): Promise<string | null> {
  const id = `sess-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('sessions').insert([
    {
      id,
      user_id: userId,
      token,
      refresh_token: refreshToken,
      active: true,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error('Error creating session:', error);
    return null;
  }
  return id;
}

export async function invalidateSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update({ active: false, invalidated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
  return true;
}

function toStuAny(r: any) { return r; }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — STUDENTS
 * ------------------------------------------------------------------ */
export async function findStudentByRoll(rollNum: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('roll', rollNum.trim().toUpperCase())
    .single();

  if (error) {
    console.error('Error finding student by roll:', error);
    return null;
  }

  return data ? mStu(data) : null;
}

export async function findAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('roll');

  if (error) {
    console.error('Error finding all students:', error);
    return [];
  }

  return data.map(mStu);
}

export async function searchStudents(q: string): Promise<Student[]> {
  const s = `%${q.toLowerCase()}%`;
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .or(`roll.ilike.${s},name.ilike.${s},department.ilike.${s}`)
    .limit(20);

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data.map(mStu);
}
export async function findByQr(payload: string): Promise<Student | null> { return findStudentByRoll(payload.trim().toUpperCase().replace(/\s+/g, "")); }
export async function getStudentByRoll(rollNum: string): Promise<Student | null> { return findStudentByRoll(rollNum); }

/* ------------------------------------------------------------------ *
 *  PUBLIC API — GATES
 * ------------------------------------------------------------------ */
export async function findGateById(id: string): Promise<Gate | null> {
  const { data, error } = await supabase
    .from('gates')
    .select('*')
    .eq('id', id)
    .single();

  if (!error && data) {
    return { id: data.id, name: data.name, location: data.location, type: data.type, isActive: !!data.is_active };
  }

  // Fallback to local GATES array if database query fails
  // This prevents crashes when database types don't match or connection issues occur
  const localGate = GATES.find(g => g.id === id);
  if (localGate) {
    return localGate;
  }

  // Suppress noisy error logging during normal operation
  if (error && error.code !== '22P02') {
    console.error('Error finding gate by id:', error);
  }
  return null;
}

export async function findAllGates(): Promise<Gate[]> {
  const { data, error } = await supabase
    .from('gates')
    .select('*');

  if (error) {
    console.error('Error finding all gates:', error);
    return [];
  }

  return data.map((r) => ({ id: r.id, name: r.name, location: r.location, type: r.type, isActive: !!r.is_active }));
}

/* ------------------------------------------------------------------ *
 *  PUBLIC API — USERS & AUTH
 * ------------------------------------------------------------------ */
/**
 * Find all users in the system
 * @returns Array of User objects
 */
export async function findAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error finding all users:', error);
    return [];
  }

  return data.map(mUser);
}

/**
 * Create a new user
 * @param userData - User data to create
 * @returns Created User object or null if failed
 */
export async function createUser(userData: {
  name: string;
  email: string;
  role: Role;
  status?: AccountStatus;
}): Promise<User | null> {
  const id = `user-${randomUUID()}`;
  const { name, email, role, status = 'ACTIVE' } = userData;

  // Hash a default password (should be changed by admin)
  const defaultPassword = randomUUID().replace(/-/g, "").substring(0, 12);
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        id,
        name,
        email,
        role,
        status,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  // Audit the user creation
  await addAudit({
    action: 'USER_CREATED',
    userId: 'system', // This is a system action
    userName: 'System',
    role: 'system',
    details: `Created new user ${id} with role ${role}`,
  });

  return data ? mUser(data) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error finding user by id:', error);
    return null;
  }

  return data ? mUser(data) : null;
}

export async function findUserByLogin(login: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`employee_id.eq.${login.trim()},email.eq.${login.trim()},name.eq.${login.trim()}`)
    .eq('status', 'ACTIVE') // Only return ACTIVE users by default
    .single();

  if (error) {
    console.error('Error finding user by login:', error);
    return null;
  }

  return data ? mUser(data) : null;
}

export async function verifyLogin(login: string, password: string): Promise<User | null> {
  const user = await findUserByLogin(login);
  if (!user) return null;

  // Check account status - only ACTIVE users can authenticate
  if (user.status !== "ACTIVE") {
    console.warn(`Login attempt for non-ACTIVE account: ${login}, status: ${user.status}`);
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    console.error('Error verifying login:', error);
    return null;
  }

  const isMatch = await bcrypt.compare(password, data.password_hash);
  return isMatch ? user : null;
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('pin_hash') // Store hashed PINs instead of plain text
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error verifying pin:', error);
    return false;
  }

  // If there's no pin_hash but there's a pin (migration case), compare directly
  if (!data.pin_hash && (data as any).pin) {
    return (data as any).pin === pin;
  }

  // If no pin is set, return false
  if (!data.pin_hash) {
    return false;
  }

  return await bcrypt.compare(pin, data.pin_hash);
}

// Helper function to hash PINs
export async function hashPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

/**
 * Update user account status and revoke all active sessions
 * @param userId - The user ID to update
 * @param newStatus - The new account status
 * @returns true if successful, false otherwise
 */
export async function updateAccountStatus(userId: string, newStatus: AccountStatus): Promise<boolean> {
  // First, get the user's current status and name for audit logging
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('status, name')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user for status update:', userError);
    return false;
  }

  // Update the user's status
  const { error: updateError } = await supabase
    .from('users')
    .update({ status: newStatus })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating user status:', updateError);
    return false;
  }

  // If the status is not ACTIVE, revoke all active sessions
  if (newStatus !== "ACTIVE") {
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({ active: false, invalidated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('active', true);

    if (sessionError) {
      console.error('Error revoking sessions for user:', sessionError);
      // Don't return false here - the status was updated, just sessions failed
    }
  }

  // Audit the status change
  await addAudit({
    action: 'ACCOUNT_STATUS_CHANGED',
    userId: 'system', // This is a system action
    userName: 'System',
    role: 'system',
    details: `Changed account status for ${userId} from ${userData.status} to ${newStatus}`,
  });

  return true;
}

/**
 * Update user role and revoke all active sessions
 * @param userId - The user ID to update
 * @param newRole - The new role to assign
 * @param actorId - The ID of the user making the change (for audit logging)
 * @returns true if successful, false otherwise
 */
export async function updateUserRole(userId: string, newRole: Role, actorId: string): Promise<boolean> {
  // First, get the user's current role and name for audit logging
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error('Error fetching user for role update:', userError);
    return false;
  }

  // Update the user's role
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating user role:', updateError);
    return false;
  }

  // Revoke all active sessions for the user
  const { error: sessionError } = await supabase
    .from('sessions')
    .update({ active: false, invalidated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('active', true);

  if (sessionError) {
    console.error('Error revoking sessions for user:', sessionError);
    // Don't return false here - the role was updated, just sessions failed
  }

  // Get the actor's name for audit logging
  const { data: actorData } = await supabase
    .from('users')
    .select('name')
    .eq('id', actorId)
    .single();

  // Audit the role change
  await addAudit({
    action: 'ROLE_CHANGED',
    userId: actorId,
    userName: actorData?.name ?? 'Unknown',
    role: 'admin', // This should be the actor's role, but we'll use admin for now
    details: `Changed role for ${userId} from ${userData.role} to ${newRole}`,
  });

  return true;
}

/**
 * Revoke all active sessions for a user
 * @param userId - The user ID to revoke sessions for
 * @returns true if successful, false otherwise
 */
export async function revokeAllSessions(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update({ active: false, invalidated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.error('Error revoking all sessions for user:', error);
    return false;
  }

  // Audit the session revocation
  await addAudit({
    action: 'ALL_SESSIONS_REVOKED',
    userId: 'system', // This is a system action
    userName: 'System',
    role: 'system',
    details: `Revoked all active sessions for user ${userId}`,
  });

  return true;
}

/* ------------------------------------------------------------------ *
 *  PUBLIC API — SCANS
 * ------------------------------------------------------------------ */
export async function lastScanFor(roll: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .eq('roll', roll)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error getting last scan for roll:', error);
    return null;
  }

  return data ? mScan(data) : null;
}

export async function scansToday(): Promise<Scan[]> {
  const t = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .gte('timestamp', `${t}T00:00:00.000Z`)
    .lte('timestamp', `${t}T23:59:59.999Z`)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error getting scans for today:', error);
    return [];
  }

  return data.map(mScan);
}
export async function studentsInside(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('campus_occupancy')
    .select('students(*)')
    .eq('current_status', 'IN');

  if (error) {
    console.error('Error getting students inside:', error);
    return [];
  }

  return data.map((d: any) => mStu(d.students));
}

export async function campusCount(): Promise<number> {
  const { count, error } = await supabase
    .from('campus_occupancy')
    .select('*', { count: 'exact', head: true })
    .eq('current_status', 'IN');

  if (error) {
    console.error('Error getting campus count:', error);
    return 0;
  }

  return count || 0;
}

export async function isDuplicate(roll: string, direction: ScanDirection, min = 5): Promise<boolean> {
  const cutoff = new Date(Date.now() - min * 60000).toISOString();
  const { data, error } = await supabase
    .from('gate_logs')
    .select('id')
    .eq('roll', roll)
    .eq('direction', direction)
    .gte('timestamp', cutoff)
    .limit(1)
    .single();

  if (error) {
    // Ignore error if it's because no rows were found
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('Error checking for duplicate scan:', error);
  }

  return !!data;
}

export async function inferDirection(roll: string): Promise<ScanDirection> {
  const l = await lastScanFor(roll);
  return l ? (l.direction === "IN" ? "OUT" : "IN") : "IN";
}

export async function addScan(input: {
  roll: string;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  operatorId: string;
  isManual?: boolean;
  timestamp?: string;
}): Promise<{ scan: Scan | null; duplicate: boolean }> {
  const stu = await findStudentByRoll(input.roll);
  if (!stu) throw new Error("STUDENT_NOT_FOUND");

  if (await isDuplicate(input.roll, input.direction)) {
    return { scan: null, duplicate: true };
  }

  const gate = (await findGateById(input.gateId)) ?? GATES[0];
  const op = (await findUserById(input.operatorId)) ?? { id: "op-1", name: "M. Ramu", role: "operator" as const };
  const ts = input.timestamp ?? new Date().toISOString();
  const id = `scan-${randomUUID()}`;

  const { data, error } = await supabase
    .from('gate_logs')
    .insert([
      {
        id,
        student_id: stu.id,
        roll: stu.roll,
        name: stu.name,
        department: stu.department,
        year: stu.year,
        direction: input.direction,
        reason: input.reason ?? null,
        gate_id: gate.id,
        gate_name: gate.name,
        operator_id: op.id,
        operator_name: op.name,
        timestamp: ts,
        is_manual: input.isManual ? 1 : 0,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error adding scan:', error);
    return { scan: null, duplicate: false };
  }

  // Upsert into campus_occupancy
  const { error: occError } = await supabase.from('campus_occupancy').upsert(
    {
      student_id: stu.id,
      current_status: input.direction,
      last_gate_id: gate.id,
      last_log_id: id,
      last_updated: ts,
    },
    { onConflict: 'student_id' }
  );

  if (occError) {
    console.error('Error updating campus occupancy:', occError);
    // Don't fail the whole operation, just log the error
  }

  await addAudit({
    action: "SCAN_CREATED",
    userId: op.id,
    userName: op.name,
    role: op.role as Role,
    details: `${input.direction} ${stu.name} (${stu.roll}) at ${gate.name}`,
    gateId: gate.id,
  });

  await addNotification(
    "parent",
    stu.parentId ?? "pa-1",
    "gate_entry",
    "Gate Entry",
    `${stu.name} (${stu.roll}) ${
      input.direction === "IN" ? "entered" : "exited"
    } campus at ${new Date(ts).toLocaleTimeString()} via ${gate.name}`
  );

  return { scan: mScan(data), duplicate: false };
}

export async function getAllLogs(f?: {
  gateId?: string;
  date?: string;
  from?: string;
  to?: string;
  direction?: string;
  reason?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  let query = supabase.from('gate_logs').select('*', { count: 'exact' });

  if (f?.gateId) {
    query = query.eq('gate_id', f.gateId);
  }
  if (f?.date) {
    query = query.gte('timestamp', `${f.date}T00:00:00.000Z`);
    query = query.lte('timestamp', `${f.date}T23:59:59.999Z`);
  } else {
    if (f?.from) {
      query = query.gte('timestamp', `${f.from}T00:00:00.000Z`);
    }
    if (f?.to) {
      query = query.lte('timestamp', `${f.to}T23:59:59.999Z`);
    }
  }
  if (f?.direction) {
    query = query.eq('direction', f.direction);
  }
  if (f?.reason) {
    query = query.eq('reason', f.reason);
  }
  if (f?.search) {
    const s = `%${f.search.toLowerCase()}%`;
    query = query.or(`roll.ilike.${s},name.ilike.${s}`);
  }

  const page = f?.page || 1;
  const limit = f?.limit || 50;
  const offset = (page - 1) * limit;

  query = query.range(offset, offset + limit - 1).order('timestamp', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('Error getting all logs:', error);
    return { items: [], total: 0, page, limit, totalPages: 0 };
  }

  const total = count || 0;
  return {
    items: data.map(mScan),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


async function addAudit(input: {
  action: string;
  userId: string;
  userName: string;
  role: string;
  details: string;
  gateId?: string;
}) {
  const { error } = await supabase.from('audit_logs').insert([
    {
      action: input.action,
      user_id: input.userId,
      user_name: input.userName,
      role: input.role,
      details: input.details,
      gate_id: input.gateId,
    },
  ]);

  if (error) {
    console.error('Error adding audit log:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  NOTIFICATIONS
 * ------------------------------------------------------------------ */
export async function addNotification(
  recipientType: string,
  recipientId: string,
  type: string,
  title: string,
  message: string
) {
  const { error } = await supabase.from('notifications').insert([
    {
      recipient_type: recipientType,
      recipient_id: recipientId,
      type,
      title,
      message,
    },
  ]);

  if (error) {
    console.error('Error adding notification:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  DASHBOARD
 * ------------------------------------------------------------------ */
export async function dashboard(): Promise<DashboardData> {
  const tsc = await scansToday();
  const ins = tsc.filter((s) => s.direction === "IN").length;
  const outs = tsc.filter((s) => s.direction === "OUT").length;
  const inside = await studentsInside();

  // Fetch real alerts (unresolved) and pending passes in parallel
  const [alerts, passes, gates] = await Promise.all([
    getAlerts(false),
    findGatePasses({ status: 'PENDING' }),
    findAllGates(),
  ]);

  // Real per-gate activity
  const locs: Array<Gate & { currentScanCount: number; lastScan: Scan | null }> = gates.map((g) => {
    const gateScans = tsc.filter((s) => s.gateId === g.id);
    return {
      ...g,
      currentScanCount: gateScans.length,
      lastScan: gateScans[0] ?? null,
    } as any;
  });

  // Department breakdown from today's scans
  const deptStats: Record<string, { in: number; out: number }> = {};
  for (const s of tsc) {
    const d = s.department || 'Unknown';
    if (!deptStats[d]) deptStats[d] = { in: 0, out: 0 };
    if (s.direction === 'IN') deptStats[d].in++;
    else deptStats[d].out++;
  }
  const total = tsc.length || 1;
  const deptBreakdown = Object.entries(deptStats).map(([dept, { in: inC, out: outC }]) => ({
    dept,
    deptCode: dept,
    in: inC,
    out: outC,
    pct: Math.round(((inC + outC) / total) * 100),
  }));

  // Trend comparison vs yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().slice(0, 10);
  const { data: yScans } = await supabase
    .from('gate_logs')
    .select('direction')
    .gte('timestamp', `${yDate}T00:00:00.000Z`)
    .lte('timestamp', `${yDate}T23:59:59.999Z`);
  const yIn = (yScans ?? []).filter((s: any) => s.direction === 'IN').length;
  const yOut = (yScans ?? []).filter((s: any) => s.direction === 'OUT').length;

  const fmtTrend = (today: number, yest: number) => {
    if (yest === 0) return today > 0 ? `+${today} vs yesterday` : '0 vs yesterday';
    const diff = today - yest;
    if (diff === 0) return 'Same as yesterday';
    return `${diff > 0 ? '+' : ''}${diff} vs yesterday`;
  };

  return {
    onCampus: inside.length,
    todayIn: ins,
    todayOut: outs,
    totalScans: tsc.length,
    activeAlerts: alerts.length,
    trendOnCampus: inside.length > 0 ? `+${inside.length} currently inside` : 'Empty campus',
    trendOut: fmtTrend(outs, yOut),
    trendScans: fmtTrend(tsc.length, (yIn + yOut)),
    locations: locs,
    activityFeed: tsc.slice(0, 20),
    deptBreakdown,
    alerts,
    gatePasses: passes,
  };
}

/* ------------------------------------------------------------------ */
export async function statsToday(): Promise<{ entries: number; exits: number; onCampus: number; lastScan: Scan | null; recentScans: Scan[] }> {
  const t = await scansToday();
  return { entries: t.filter((s) => s.direction === "IN").length, exits: t.filter((s) => s.direction === "OUT").length, onCampus: await campusCount(), lastScan: t[0] ?? null, recentScans: t.slice(0, 5) };
}

/* ------------------------------------------------------------------ *
 *  STUDENT STATUS & HISTORY (for parent/student views)
 * ------------------------------------------------------------------ */
export async function getStudentStatus(roll: string): Promise<{ status: "IN" | "OUT"; lastScan: Scan | null; name?: string }> {
  // First get the student ID using parameterized query
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id')
    .eq('roll', roll.trim().toUpperCase())
    .single();

  if (studentError || !student) {
    return { status: "OUT", lastScan: null };
  }

  // Then get the occupancy status using the student ID
  const { data, error } = await supabase
    .from('campus_occupancy')
    .select('current_status, last_log_id')
    .eq('student_id', student.id)
    .single();

  if (error || !data) {
    return { status: "OUT", lastScan: null };
  }

  const lastScan = await lastScanFor(roll);
  return { status: data.current_status as "IN" | "OUT", lastScan, name: lastScan?.name };
}

export async function getStudentHistory(roll: string, limit: number = 20): Promise<Scan[]> {
  const { data, error } = await supabase
    .from('gate_logs')
    .select('*')
    .eq('roll', roll)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting student history:', error);
    return [];
  }

  return data.map(mScan);
}

export async function getParentChildren(parentId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('parent_id', parentId)
    .order('roll');

  if (error) {
    console.error('Error getting parent children:', error);
    return [];
  }

  return data.map(mStu);
}

export default {};
