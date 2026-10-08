/* eslint-disable */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as browserClient, invalidateAllUserSessions, getSupabaseServiceClient } from './dbClient';
import { randomUUID } from "crypto";
import bcrypt from 'bcryptjs';
import { db, query, withTransaction, getPostgresPool } from "./postgres";

export { db, query, withTransaction, getPostgresPool };

// Always export the browser client for general use, and helper for server context
export const supabase = browserClient;

export function getDbClient(): SupabaseClient {
    if (typeof window === 'undefined') {
        if (process.env.DATABASE_URL) {
            return db as unknown as SupabaseClient;
        }
        try {
            return getSupabaseServiceClient();
        } catch (e) {
            return db as unknown as SupabaseClient;
        }
    }
    return browserClient;
}

import type {
  Department, DepartmentCode, Gate, Person, Student, PersonType, StudentDetails, EmployeeDetails, VisitorLog,
  Scan, ScanDirection, ExitReason, GatePass, GatePassStatus, Alert, AlertSeverity, AuditEntry,
  User, DashboardData, Role, AccountStatus, PersonTypeStats, DailyGateStats
} from "./types";

export function sanitizePostgrestParam(val: string | null | undefined): string {
  if (!val || typeof val !== "string") return "";
  return val.replace(/[^a-zA-Z0-9_\-\.\@]/g, "").trim();
}

export async function resolveAlert(alertId: string, userId: string): Promise<boolean> {
  const db = getDbClient();
  const { data: user } = await db.from('users').select('name').eq('id', userId).single();
  const { error } = await db
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



type Reason = ExitReason;

/* ------------------------------------------------------------------ *
 *  MAPPERS
 * ------------------------------------------------------------------ */
export function mPerson(r: any): Person {
  if (!r) return r;
  const personType: PersonType = r.role || r.person_type || r.personType || "student";
  const uniqueId = r.unique_id || r.uniqueId || r.roll || "";
  const fullName = r.full_name || r.fullName || r.name || "";
  
  const studentDetails: StudentDetails | undefined = r.student_details ? {
    personId: r.student_details.person_id || r.id,
    roll: r.student_details.roll || uniqueId,
    year: r.student_details.year,
    section: r.student_details.section,
    batch: r.student_details.batch,
    parentId: r.student_details.guardian_id, guardianId: r.student_details.guardian_id,
    studentType: r.student_details.student_type,
    hostelBlock: r.student_details.hostel_block,
    roomNumber: r.student_details.room_number,
    hostelCurfewTime: r.student_details.hostel_curfew_time,
    gender: r.student_details.gender,
    wardenId: r.student_details.warden_id,
  } : undefined;

  const employeeDetails: EmployeeDetails | undefined = r.employee_details ? {
    personId: r.employee_details.person_id || r.id,
    employeeId: r.employee_details.employee_id || uniqueId,
    designation: r.employee_details.designation,
    joiningDate: r.employee_details.joining_date,
    isHod: r.employee_details.is_hod,
    departmentId: r.employee_details.department_id,
  } : undefined;

  return {
    id: r.id,
    uniqueId,
    fullName,
    personType,
    department: (() => {
      const deptCodeMap: Record<string, string> = {
        "02": "EEE",
        "03": "ME",
        "04": "ECE",
        "05": "CSE",
        "12": "IT"
      };
      const rawDept = r.department || r.department_id || r.employee_details?.department_id || undefined;
      if (!rawDept) return undefined;
      const deptCode = deptCodeMap[rawDept] || rawDept;
      const deptObj = DEPARTMENTS.find(d => d.code === deptCode || d.name === deptCode);
      return deptObj ? deptObj.name : deptCode;
    })(),
    designation: r.designation || r.employee_details?.designation || undefined,
    email: r.email || undefined,
    phone: r.phone || undefined,
    photoUrl: r.photo_url || r.photo || undefined,
    qrCode: r.qr_code || undefined,
    idValidUntil: r.id_valid_until || undefined,
    status: r.status || "active",
    visitorHost: r.visitor_host || undefined,
    visitorPurpose: r.visitor_purpose || undefined,
    checkedInAt: r.checked_in_at || undefined,
    checkedOutAt: r.checked_out_at || undefined,
    createdAt: r.created_at || undefined,
    updatedAt: r.updated_at || undefined,
    flagStatus: r.flag_status ?? null,
    thumbprintHash: r.thumbprint_hash || r.thumbprintHash || undefined,
    thumbprintVerifiedAt: r.thumbprint_verified_at || r.thumbprintVerifiedAt || undefined,
    studentDetails,
    employeeDetails,
    // Backwards-compatibility aliases
    roll: uniqueId,
    name: fullName,
    photo: r.photo_url || r.photo || undefined,
    year: studentDetails?.year || r.year,
    section: studentDetails?.section || r.section,
    batch: studentDetails?.batch || r.batch,
    parentName: r.parent_name,
    parentPhone: r.parent_phone,
    parentId: studentDetails?.guardianId || studentDetails?.parentId || r.guardian_id, guardianId: studentDetails?.guardianId || studentDetails?.parentId || r.guardian_id,
    studentType: studentDetails?.studentType || r.student_type,
    gender: studentDetails?.gender || r.gender,
    hostelBlock: (studentDetails as any)?.hostel_block || studentDetails?.hostelBlock || r.hostel_block,
    roomNumber: (studentDetails as any)?.room_number || studentDetails?.roomNumber || r.room_number,
    hostelCurfewTime: (studentDetails as any)?.hostel_curfew_time || studentDetails?.hostelCurfewTime || r.hostel_curfew_time,
    wardenId: (studentDetails as any)?.warden_id || studentDetails?.wardenId || r.warden_id,
  };
}

export function mStu(r: any): Student {
  return mPerson(r);
}

function mUser(r: any): User {
  const isHod = r.is_hod || r.employee_details?.is_hod || undefined;
  const departmentId = r.department_id || r.employee_details?.department_id || undefined;
  return {
    id: r.id,
    employeeId: r.employee_id || r.employee_details?.employee_id || undefined,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    gateId: r.gate_id || undefined,
    parentId: r.guardian_id || undefined, guardianId: r.guardian_id || undefined,
    supervisedGates: r.supervised_gates || undefined,
    assignedHostel: r.assigned_hostel || undefined,
    isHod,
    departmentId,
    canViewGender: r.can_view_gender || undefined,
    status: r.status || "ACTIVE",
    personType: r.person_type || undefined,
    uniqueId: r.unique_id || undefined,
    // flag_status is not on the User type but we pass it through for API consumers
    ...( r.flag_status !== undefined ? { flagStatus: r.flag_status } : {} ),
  };
}

function mScan(r: any): Scan {
  const user = r.users; // joined user object
  const student = user?.student_details; // nested student details
  
  const uniqueId = user?.unique_id || r.unique_id || r.roll || "";
  const name = user?.name || r.name || r.person_name || "";
  const personType = user?.role || r.person_type || "student";
  const department = (() => {
    const deptCodeMap: Record<string, string> = {
      "02": "EEE",
      "03": "ME",
      "04": "ECE",
      "05": "CSE",
      "12": "IT"
    };
    const rawDept = user?.department || user?.department_id || r.department || undefined;
    if (!rawDept) return undefined;
    const deptCode = deptCodeMap[rawDept] || rawDept;
    const deptObj = DEPARTMENTS.find(d => d.code === deptCode || d.name === deptCode);
    return deptObj ? deptObj.name : deptCode;
  })();
  const year = student?.year || r.year || undefined;
  const personId = r.user_id || r.person_id || undefined;

  return {
    id: r.id,
    roll: uniqueId,
    uniqueId,
    name,
    personType,
    department,
    year,
    direction: r.direction,
    reason: r.reason,
    gateId: r.gate_id,
    gateName: r.gate_name,
    operatorId: r.operator_id,
    operatorName: r.operator_name,
    timestamp: r.timestamp,
    isManual: !!r.is_manual,
    isCorrection: !!r.is_correction,
    originalScanId: r.original_scan_id || r.original_log_id || undefined,
    personId,
  };
}

function mPass(r: any): GatePass {
  return {
    id: r.id,
    roll: r.roll,
    studentName: r.requester_name,
    department: r.department,
    reason: r.reason,
    from: r.from_datetime,
    to: r.to_datetime,
    description: r.description,
    requestedById: r.requested_by_id,
    requestedByName: r.requested_by_name,
    requestedAt: r.requested_at,
    parentStatus: r.guardian_status || r.guardian_status || 'PENDING',
    adminStatus: r.admin_status,
    finalStatus: r.final_status,
    parentComment: r.guardian_comment || r.guardian_comment,
    adminComment: r.admin_comment,
    parentApproverId: r.guardian_approver_id || r.guardian_approver_id,
    adminApproverId: r.admin_approver_id,
    qrCode: r.qr_code,
  };
}

function mAlert(r: any): Alert {
  return {
    id: r.id,
    severity: r.severity,
    title: r.title,
    message: r.message,
    gateId: r.gate_id,
    studentRoll: r.user_unique_id || r.student_roll || '',
    timestamp: r.timestamp,
    resolved: !!r.resolved,
  };
}

export async function findPass(passId: string): Promise<GatePass | null> {
  const { getSupabaseServiceClient } = await import('./dbClient');
  const client = getSupabaseServiceClient();

  const { data, error } = await client
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
  const { getSupabaseServiceClient } = await import('./dbClient');
  const client = getSupabaseServiceClient();

  const isParentRole = role === 'parent';
  const updateField = isParentRole ? 'guardian_status' : 'admin_status';
  const commentField = isParentRole ? 'guardian_comment' : 'admin_comment';
  const approverField = isParentRole ? 'guardian_approver_id' : 'admin_approver_id';
  const statusValue = 'APPROVED';

  const { data: pass, error: readErr } = await client
    .from('gate_passes')
    .select('*')
    .eq('id', passId)
    .single();

  if (readErr || !pass) {
    console.error('Error reading pass for approval:', readErr);
    return false;
  }

  const newParentStatus = isParentRole ? statusValue : pass.guardian_status;
  const newAdminStatus = !isParentRole ? statusValue : pass.admin_status;
  const finalStatus =
    newParentStatus === 'REJECTED' || newAdminStatus === 'REJECTED'
      ? 'REJECTED'
      : (newParentStatus === 'APPROVED' && newAdminStatus === 'APPROVED') || (!isParentRole && newAdminStatus === 'APPROVED')
      ? 'APPROVED'
      : newParentStatus === 'APPROVED'
      ? 'APPROVED_PARENT'
      : 'APPROVED_ADMIN';

  let updatePayload: Record<string, any> = {
    [updateField]: statusValue,
    [commentField]: comment,
    [approverField]: approverId,
    final_status: finalStatus,
  };

  let { error } = await client
    .from('gate_passes')
    .update(updatePayload)
    .eq('id', passId);

  if (error && isParentRole && error.code === 'PGRST204') {
    // Retry with guardian_status column names if guardian_status column is missing
    updatePayload = {
      guardian_status: statusValue,
      guardian_comment: comment,
      guardian_approver_id: approverId,
      final_status: finalStatus,
    };
    const retry = await client.from('gate_passes').update(updatePayload).eq('id', passId);
    error = retry.error;
  }

  if (error) {
    console.error('Error approving pass:', error);
    return false;
  }

  if (approverId) {
    const { data: user } = await getDbClient().from('users').select('name').eq('id', approverId).single();
    await addAudit({
      action: `GATE_PASS_APPROVED_${role.toUpperCase()}`,
      userId: approverId,
      userName: user?.name ?? 'Unknown',
      role: role as any,
      details: `Approved gate pass ${passId} — ${comment}`,
    });
  }

  return true;
}

export async function rejectPass(passId: string, role: string, comment: string = "", approverId?: string): Promise<boolean> {
  const updateField = role === 'parent' ? 'guardian_status' : 'admin_status';
  const commentField = role === 'parent' ? 'guardian_comment' : 'admin_comment';
  const approverField = role === 'parent' ? 'guardian_approver_id' : 'admin_approver_id';

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
    const { data: user } = await getDbClient().from('users').select('name').eq('id', approverId).single();
    await addAudit({
      action: `GATE_PASS_REJECTED_${role.toUpperCase()}`,
      userId: approverId,
      userName: user?.name ?? 'Unknown',
      role: role as any,
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
  isParentRequest?: boolean;
}): Promise<GatePass | null> {
  const person = await findPersonByUniqueId(passData.roll.trim().toUpperCase());
  if (!person) {
    console.error('Person not found for pass creation:', passData.roll);
    return null;
  }

  const id = `pass-${Date.now()}`;
  const qrCode = `PASS-${id}-${person.uniqueId}-${Date.now()}`;
  const parentStatus = passData.isParentRequest ? 'APPROVED' : 'PENDING';

  const { getSupabaseServiceClient } = await import('./dbClient');
  const serviceClient = getSupabaseServiceClient();

  const isValidUuid = (val?: string) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  let verifiedUserId: string | null = null;
  const { data: dbUser } = await serviceClient.from('users').select('id').eq('unique_id', person.uniqueId).maybeSingle();
  if (dbUser) {
    verifiedUserId = dbUser.id;
  }

  let verifiedReqById: string | null = null;
  if (isValidUuid(passData.requestedById)) {
    const { data: dbReq } = await serviceClient.from('users').select('id').eq('id', passData.requestedById).maybeSingle();
    if (dbReq && passData.requestedById) verifiedReqById = passData.requestedById;
  }
  if (!verifiedReqById && verifiedUserId) verifiedReqById = verifiedUserId;

  const dbReasonMap: Record<string, string> = {
    "day_pass": "Day Out",
    "home_out": "Home Out",
  };
  const dbReason = dbReasonMap[passData.reason] || passData.reason;

  const personName = person.fullName || person.name || "Student";

  let passRow: Record<string, any> = {
    user_id: verifiedUserId || undefined,
    roll: person.uniqueId,
    requester_name: personName,
    department: person.department || '',
    reason: dbReason,
    from_datetime: passData.from,
    to_datetime: passData.to,
    description: passData.description || null,
    requested_by_id: verifiedReqById || undefined,
    requested_by_name: passData.requestedByName || personName,
    requested_at: new Date().toISOString(),
    guardian_status: parentStatus,
    admin_status: 'PENDING',
    final_status: passData.isParentRequest ? 'APPROVED_PARENT' : 'PENDING',
    qr_code: qrCode,
  };

  let { data, error } = await serviceClient.from('gate_passes').insert(passRow).select().single();

  if (error && (error.code === '23503' || error.code === 'PGRST204')) {
    delete passRow.department;
    delete passRow.guardian_status;
    if (error.code === '23503') {
      delete passRow.user_id;
      delete passRow.requested_by_id;
    }
    const retry = await serviceClient.from('gate_passes').insert(passRow).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    console.error('Error creating gate pass:', error);
    return null;
  }

  return mPass(data);
}

export async function findGatePasses(filters: {
  status?: string;
  roll?: string;
  parentId?: string;
  guardianId?: string;
  limit?: number;
}): Promise<GatePass[]> {
  const { getSupabaseServiceClient } = await import('./dbClient');
  const serviceClient = getSupabaseServiceClient();
  let query = serviceClient.from('gate_passes').select('*');

  if (filters.status) {
    const rawStatus = filters.status.trim().toUpperCase();
    if (rawStatus === 'APPROVED') {
      query = query.eq('final_status', 'APPROVED');
    } else if (rawStatus === 'PENDING') {
      query = query.in('final_status', ['PENDING', 'APPROVED_PARENT', 'APPROVED_ADMIN']);
    } else if (rawStatus === 'REJECTED') {
      query = query.eq('final_status', 'REJECTED');
    } else {
      query = query.eq('final_status', rawStatus);
    }
  }

  const pId = filters.parentId || filters.guardianId;
  if (pId) {
    const children = await getParentChildren(pId);
    const rolls = children.map(c => c.roll).filter(Boolean);
    if (rolls.length === 0) return [];
    if (filters.roll) {
      if (rolls.includes(filters.roll.trim().toUpperCase())) {
        query = query.eq('roll', filters.roll.trim().toUpperCase());
      } else {
        return [];
      }
    } else {
      query = query.in('roll', rolls);
    }
  } else if (filters.roll) {
    query = query.eq('roll', filters.roll.trim().toUpperCase());
  }

  query = query.order('requested_at', { ascending: false });
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching passes:', error);
    return [];
  }
  return (data || []).map(mPass);
}

export async function correctionCandidates(): Promise<Scan[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey!inner(name, role, unique_id, department_id, student_details:student_details!student_details_user_id_fkey(year))')
    .gte('timestamp', oneHourAgo)
    .eq('is_correction', false)
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching correction candidates:', error);
    return [];
  }

  return (data || []).map(mScan);
}

export async function correctScan(
  originalScanId: string,
  newDirection: ScanDirection,
  newReason: ExitReason | undefined,
  reason: string,
  userId: string,
  userName: string,
  role: string
): Promise<Scan | null> {
  const { data: origScan, error: origErr } = await supabase
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey!inner(name, role, unique_id, department_id, student_details:student_details!student_details_user_id_fkey(year))')
    .eq('id', originalScanId)
    .single();

  if (origErr || !origScan) {
    console.error('Original scan not found for correction:', origErr);
    return null;
  }

  const originalTime = new Date(origScan.timestamp).getTime();
  if (Date.now() - originalTime > 60 * 60 * 1000) {
    console.warn('Scan is outside 1-hour correction window:', originalScanId);
    return null;
  }

  const newId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  const correctionRow = {
    id: newId,
    user_id: origScan.user_id,
    direction: newDirection,
    reason: newReason || null,
    gate_id: origScan.gate_id,
    gate_name: origScan.gate_name,
    operator_id: userId,
    operator_name: userName,
    timestamp: new Date().toISOString(),
    is_manual: true,
    is_correction: true,
    original_log_id: originalScanId,
    correction_reason: reason
  };

  const { data: newScanData, error: insertErr } = await supabase
    .from('movement_logs')
    .insert(correctionRow)
    .select('*, users:users!movement_logs_user_id_fkey!inner(name, role, unique_id, department_id, student_details:student_details!student_details_user_id_fkey(year))')
    .single();

  if (insertErr || !newScanData) {
    console.error('Error creating correction scan:', insertErr);
    return null;
  }

  await addAudit({
    action: 'SCAN_CORRECTED',
    userId,
    userName,
    role: role as Role,
    details: `Corrected scan ${originalScanId}: ${origScan.direction} -> ${newDirection}. Reason: ${reason}`,
    gateId: origScan.gate_id,
  });

  return mScan(newScanData);
}

export async function getAllGatesLive(): Promise<Gate[]> {
  const client = getDbClient();
  const { data: persistentGates } = await client.from('gates').select('*');
  if (!persistentGates || persistentGates.length === 0) return [];

  // Fetch online operators (status ACTIVE and session handle IS NOT NULL)
  const { data: onlineOperators } = await client
    .from('users')
    .select('id, gate_id, supervised_gates, role')
    .eq('status', 'ACTIVE')
    .not('handle', 'is', null)
    .in('role', ['operator', 'admin', 'sysadmin']);

  // Fetch recent scans (within last 15 minutes)
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: recentScans } = await client
    .from('movement_logs')
    .select('gate_id')
    .gte('timestamp', fifteenMinsAgo);

  const activeGateIdsFromScans = new Set((recentScans || []).map((s: any) => s.gate_id));
  const activeGateIdsFromOperators = new Set<string>();

  if (onlineOperators) {
    for (const op of onlineOperators) {
      if (op.gate_id) activeGateIdsFromOperators.add(op.gate_id);
      if (Array.isArray(op.supervised_gates)) {
        for (const sg of op.supervised_gates) activeGateIdsFromOperators.add(sg);
      }
    }
  }

  return persistentGates.map((g: any) => {
    const isConfiguredActive = g.is_active !== false;
    const hasOnlineOperator = activeGateIdsFromOperators.has(g.id);
    const hasRecentScan = activeGateIdsFromScans.has(g.id);

    // Gate is ONLINE only if it is configured active AND has an online operator or recent scan activity
    const isOnline = isConfiguredActive && (hasOnlineOperator || hasRecentScan);

    return {
      id: g.id,
      name: g.name,
      location: g.location,
      type: g.type,
      isActive: isOnline,
    };
  });
}

export async function getAlerts(resolved?: boolean): Promise<Alert[]> {
  let query = getDbClient().from('alerts').select('*').order('timestamp', { ascending: false });
  if (typeof resolved === 'boolean') {
    query = query.eq('resolved', resolved);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  return (data || []).map(mAlert);
}

export async function getNotifications(recipientType: string, recipientId: string): Promise<any[]> {
  const safeType = sanitizePostgrestParam(recipientType);
  const safeId = sanitizePostgrestParam(recipientId);

  let query = getDbClient()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (safeId) {
    query = query.or(`recipient_id.eq.${safeId},recipient_type.eq.all`);
  } else if (safeType && safeType !== 'all') {
    query = query.or(`recipient_type.eq.${safeType},recipient_type.eq.all`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

// NOTE: Session lifecycle is fully owned by Supabase Auth (GoTrue).
// The legacy custom `sessions` table functions (`getUserForSession`,
// `createSession`, `invalidateSession`) were removed. To revoke a user's
// sessions, use `invalidateAllUserSessions` from '@/lib/dbClient'.

/* ------------------------------------------------------------------ *
 *  UNIFIED PERSONS FUNCTIONS
 * ------------------------------------------------------------------ */

export async function findPersonByUniqueId(uniqueId: string): Promise<Person | null> {
  const formattedId = sanitizePostgrestParam(uniqueId).trim().toUpperCase();
  if (!formattedId) return null;

  // Use service client to bypass RLS — access control is enforced at the API layer
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch (clientErr) {
    console.warn('[db] findPersonByUniqueId: Fallback to browser client', clientErr);
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedId);

  // Tier 1: Query users table with auto-resolved relationships
  try {
    if (isUuid) {
      const { data: userData } = await client.from('users').select('*, student_details!student_details_user_id_fkey(*), employee_details(*)').eq('id', formattedId).maybeSingle();
      if (userData) return mPerson(userData);
    }
    const { data: userData, error: uErr } = await client.from('users').select('*, student_details!student_details_user_id_fkey(*), employee_details(*)').eq('unique_id', formattedId).maybeSingle();
    if (!uErr && userData) {
      return mPerson(userData);
    }
  } catch (err) {
    console.warn('[db] findPersonByUniqueId Tier 1 error:', err);
  }

  // Tier 2: Query simple users table without joins (if explicit join failed)
  try {
    if (isUuid) {
      const { data: simpleUser } = await client.from('users').select('*').eq('id', formattedId).maybeSingle();
      if (simpleUser) {
        const { data: sDet } = await client.from('student_details').select('*').eq('user_id', simpleUser.id).maybeSingle();
        const { data: eDet } = await client.from('employee_details').select('*').eq('user_id', simpleUser.id).maybeSingle();
        return mPerson({ ...simpleUser, student_details: sDet || undefined, employee_details: eDet || undefined });
      }
    }
    const { data: simpleUser } = await client.from('users').select('*').eq('unique_id', formattedId).maybeSingle();
    if (simpleUser) {
      const { data: sDet } = await client.from('student_details').select('*').eq('user_id', simpleUser.id).maybeSingle();
      const { data: eDet } = await client.from('employee_details').select('*').eq('user_id', simpleUser.id).maybeSingle();
      return mPerson({
        ...simpleUser,
        student_details: sDet || undefined,
        employee_details: eDet || undefined,
      });
    }
  } catch (err) {
    console.warn('[db] findPersonByUniqueId Tier 2 error:', err);
  }

  // Tier 3: Query student_details by roll number directly
  try {
    const { data: sDetails } = await client
      .from('student_details')
      .select('*')
      .eq('roll', formattedId)
      .maybeSingle();

    if (sDetails && sDetails.user_id) {
      const { data: userRecord } = await client.from('users').select('*').eq('id', sDetails.user_id).maybeSingle();
      if (userRecord) {
        return mPerson({ ...userRecord, student_details: sDetails });
      }
    }
  } catch (err) {
    console.warn('[db] findPersonByUniqueId Tier 3 error:', err);
  }

  // Tier 4: Query employee_details by employee_id directly (faculty/staff tracking)
  try {
    const { data: eDetails } = await client
      .from('employee_details')
      .select('*')
      .eq('employee_id', formattedId)
      .maybeSingle();

    if (eDetails && eDetails.user_id) {
      const { data: userRecord } = await client.from('users').select('*').eq('id', eDetails.user_id).maybeSingle();
      if (userRecord) {
        return mPerson({ ...userRecord, employee_details: eDetails });
      }
    }
  } catch (err) {
    console.warn('[db] findPersonByUniqueId Tier 4 error:', err);
  }

  // Tier 5: Try hyphenated/stripped variants (e.g. FAC001 <-> FAC-001, EMP001 <-> EMP-001)
  try {
    const hasHyphen = formattedId.includes("-");
    const altId = hasHyphen ? formattedId.replace(/-/g, "") : formattedId.replace(/^([A-Z]+)(\d+)$/, "$1-$2");
    if (altId && altId !== formattedId) {
      const { data: altUser } = await client
        .from('users')
        .select('*, student_details!student_details_user_id_fkey(*), employee_details(*)')
        .eq('unique_id', altId)
        .maybeSingle();
      if (altUser) {
        return mPerson(altUser);
      }

      const { data: altEmp } = await client
        .from('employee_details')
        .select('*')
        .eq('employee_id', altId)
        .maybeSingle();
      if (altEmp && altEmp.user_id) {
        const { data: userRec } = await client.from('users').select('*').eq('id', altEmp.user_id).maybeSingle();
        if (userRec) {
          return mPerson({ ...userRec, employee_details: altEmp });
        }
      }
    }
  } catch { /* fallback */ }

  // Person not found in database
  return null;
}

// Backwards compatibility aliases
export const findStudentByRoll = findPersonByUniqueId;
export const getStudentByRoll = findPersonByUniqueId;
export async function findByQr(payload: string): Promise<Person | null> {
  return findPersonByUniqueId(payload.trim().toUpperCase().replace(/\s+/g, ""));
}

export async function findAllPersons(type?: PersonType): Promise<Person[]> {
  const db = getDbClient();

  // ponytail: two plain queries + JS merge avoids PostgREST embed ambiguity
  // (student_details has 2 FKs to users: user_id + guardian_id), which makes
  // embedded selects fail depending on constraint naming.
  let query = db.from('users').select('*');
  if (type) {
    query = query.eq('role', type);
  }
  const { data, error } = await query;

  if (error || !data) {
    console.error('findAllPersons users query error:', error);
    return [];
  }
  if (data.length === 0) return [];

  // Fetch auxiliary details for these users and merge
  const ids = data.map((u: any) => u.id);
  const [studentRows, employeeRows] = await Promise.all([
    db.from('student_details').select('*').in('user_id', ids),
    db.from('employee_details').select('*').in('user_id', ids),
  ]);

  const studentMap = new Map((studentRows.data || []).map((s: any) => [s.user_id, s]));
  const employeeMap = new Map((employeeRows.data || []).map((e: any) => [e.user_id, e]));

  return data.map((u: any) =>
    mPerson({
      ...u,
      student_details: studentMap.get(u.id),
      employee_details: employeeMap.get(u.id),
    })
  );
}

export const findAllStudents = () => findAllPersons('student');

export async function findPersonsByType(type: PersonType): Promise<Person[]> {
  return findAllPersons(type);
}

export async function searchPersons(q: string, type?: PersonType): Promise<Person[]> {
  const safeQ = sanitizePostgrestParam(q);
  const searchTerm = `%${safeQ.toLowerCase()}%`;
  const db = getDbClient();
  let query = db.from('users').select('*');

  if (type) {
    query = query.eq('role', type);
  }

  query = query.or(`name.ilike.${searchTerm},unique_id.ilike.${searchTerm},email.ilike.${searchTerm}`);

  const { data, error } = await query;
  if (error || !data) {
    console.error('searchPersons query error:', error);
    return [];
  }
  if (data.length === 0) return [];

  const ids = data.map((u: any) => u.id);
  const [studentRows, employeeRows] = await Promise.all([
    db.from('student_details').select('*').in('user_id', ids),
    db.from('employee_details').select('*').in('user_id', ids),
  ]);

  const studentMap = new Map((studentRows.data || []).map((s: any) => [s.user_id, s]));
  const employeeMap = new Map((employeeRows.data || []).map((e: any) => [e.user_id, e]));

  return data.map((u: any) =>
    mPerson({
      ...u,
      student_details: studentMap.get(u.id),
      employee_details: employeeMap.get(u.id),
    })
  );
}

export const searchStudents = (q: string) => searchPersons(q, 'student');

export async function createVisitor(data: {
  fullName: string;
  phone?: string;
  email?: string;
  visitorHost?: string;
  visitorPurpose?: string;
}): Promise<Person | null> {
  const id = randomUUID();
  const visitorId = `VIS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const userRow = {
    id,
    unique_id: visitorId,
    handle: visitorId.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    name: data.fullName,
    role: 'visitor',
    phone: data.phone || null,
    email: data.email || `${visitorId.toLowerCase()}@visitor.gatekeeper.edu`,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };

  const { data: newPerson, error } = await getDbClient().from('users').insert(userRow).select().single();
  if (error || !newPerson) {
    console.error('Error creating visitor:', error);
    return null;
  }

  // Create visitor log
  await getDbClient().from('visitor_logs').insert({
    id: randomUUID(),
    user_id: id,
    check_in_at: new Date().toISOString(),
    purpose: data.visitorPurpose || null,
    status: 'active',
  });

  return mPerson(newPerson);
}

export async function checkInVisitor(personId: string, hostPersonId?: string, purpose?: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error: pErr } = await supabase
    .from('users')
    .update({ status: 'ACTIVE' })
    .eq('id', personId);

  if (pErr) return false;

  await getDbClient().from('visitor_logs').insert({
    id: randomUUID(),
    user_id: personId,
    check_in_at: now,
    host_user_id: hostPersonId || null,
    purpose: purpose || null,
    status: 'active',
  });

  return true;
}

export async function checkOutVisitor(personId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error: pErr } = await supabase
    .from('users')
    .update({ status: 'DISABLED' })
    .eq('id', personId);

  if (pErr) return false;

  await supabase
    .from('visitor_logs')
    .update({ check_out_at: now, status: 'completed' })
    .eq('user_id', personId)
    .eq('status', 'active');

  return true;
}

/* ------------------------------------------------------------------ *
 *  GATES & USERS
 * ------------------------------------------------------------------ */

export async function findGateById(id: string): Promise<Gate | null> {
  if (!id) return null;

  if (typeof window !== "undefined") {
    try {
      const authStore = (await import("@/stores/authStore")).useAuthStore.getState();
      const token = authStore.token;
      const sessionToken = authStore.user?.currentSessionToken;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (sessionToken) headers["X-Session-Token"] = sessionToken;

      const res = await fetch("/api/gates", { headers });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const query = id.toLowerCase();
          const match = result.data.find((g: any) => {
            const gId = g.id?.toLowerCase();
            const code = g.gate_code?.toLowerCase();
            const name = g.name?.toLowerCase();
            return gId === query ||
                   code === query ||
                   name === query ||
                   (query === "1" || query === "gate-1" ? (code === "gate-01" || code === "main" || code === "gate-1" || code === "1") : false) ||
                   (query === "2" || query === "gate-2" ? (code === "gate-02" || code === "hostel" || code === "gate-2" || code === "2") : false) ||
                   (query === "3" || query === "gate-3" ? (code === "gate-03" || code === "back" || code === "gate-3" || code === "3") : false);
          });
          if (match) {
            return { id: match.id, name: match.name, location: match.location, type: match.type, isActive: !!match.is_active };
          }
          const first = result.data[0];
          if (first) {
            return { id: first.id, name: first.name, location: first.location, type: first.type, isActive: !!first.is_active };
          }
        }
      }
    } catch (err) {
      console.warn("findGateById client fetch error:", err);
    }
  }

  const client = getDbClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    const { data, error } = await client.from('gates').select('*').eq('id', id).maybeSingle();
    if (!error && data) {
      return { id: data.id, name: data.name, location: data.location, type: data.type, isActive: !!data.is_active };
    }
  }

  const { data: allData } = await client.from('gates').select('*');
  if (allData && allData.length > 0) {
    const query = id.toLowerCase();
    const match = allData.find(g => {
      const gId = g.id?.toLowerCase();
      const code = g.gate_code?.toLowerCase();
      const name = g.name?.toLowerCase();
      return gId === query ||
             code === query ||
             name === query ||
             (query === "1" || query === "gate-1" ? (code === "gate-01" || code === "main" || code === "gate-1" || code === "1") : false) ||
             (query === "2" || query === "gate-2" ? (code === "gate-02" || code === "hostel" || code === "gate-2" || code === "2") : false) ||
             (query === "3" || query === "gate-3" ? (code === "gate-03" || code === "back" || code === "gate-3" || code === "3") : false);
    });
    if (match) {
      return { id: match.id, name: match.name, location: match.location, type: match.type, isActive: !!match.is_active };
    }
    return { id: allData[0].id, name: allData[0].name, location: allData[0].location, type: allData[0].type, isActive: !!allData[0].is_active };
  }

  return { id: id || "gate-1", name: "Main Gate", location: "Main Entrance", type: "main", isActive: true };
}

export async function findAllGates(): Promise<Gate[]> {
  if (typeof window !== "undefined") {
    try {
      const authStore = (await import("@/stores/authStore")).useAuthStore.getState();
      const token = authStore.token;
      const sessionToken = authStore.user?.currentSessionToken;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (sessionToken) headers["X-Session-Token"] = sessionToken;

      const res = await fetch("/api/gates", { headers });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          return result.data;
        }
      }
    } catch (err) {
      console.warn("findAllGates client fetch error:", err);
    }
  }

  return getAllGatesLive();
}

export async function findAllUsers(): Promise<User[]> {
  const client = getDbClient();
  const { data, error } = await client.from('users').select('*, employee_details(*)');
  if (error || !data) return [];
  return data.map(mUser);
}

/**
 * Insert a user profile into public.users.
 *
 * IMPORTANT: `id` MUST be the UUID of an ALREADY-PROVISIONED Supabase Auth
 * user — public.users.id is a foreign key to auth.users.id (see
 * consolidated_clean_schema.sql). Passwords live only in Supabase Auth;
 * secondary PINs are stored bcrypt-hashed in `initial_pin_hash`.
 */
export async function createUser(userData: {
  id: string;
  name: string;
  role: Role;
  employeeId?: string;
  email?: string;
  phone?: string;
  gateId?: string;
  parentId?: string;
    guardianId?: string;
  supervisedGates?: string[];
  assignedHostel?: string;
  isHod?: boolean;
  departmentId?: string;
  canViewGender?: string[];
  status?: AccountStatus;
  loginIdentifier?: string;
  initialPinHash?: string;
  hostelRoom?: string;
  isHosteller?: boolean;
  uniqueId?: string;
}): Promise<User | null> {
  const db = getDbClient();
  const uniqueId = userData.uniqueId || userData.employeeId || userData.loginIdentifier || userData.email || userData.id;
  const handle = (userData.loginIdentifier || uniqueId || userData.name || `user_${userData.id.replace(/-/g, '').slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9_]/g, '_');

  const { data, error } = await db
    .from('users')
    .upsert({
      id: userData.id,
      unique_id: uniqueId,
      handle,
      name: userData.name,
      role: userData.role,
      email: userData.email || null,
      phone: userData.phone || null,
      gate_id: userData.gateId || null,
      supervised_gates: userData.supervisedGates || null,
      assigned_hostel: userData.assignedHostel || userData.hostelRoom || null,
      department_id: userData.departmentId || null,
      can_view_gender: userData.canViewGender || null,
      status: userData.status || 'ACTIVE',
      login_identifier: userData.loginIdentifier || uniqueId,
      initial_pin_hash: userData.initialPinHash || null,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  // Insert/upsert auxiliary employee_details if applicable
  if (userData.employeeId || userData.isHod || ['faculty', 'staff', 'worker', 'operator', 'admin', 'sysadmin'].includes(userData.role)) {
    try {
      await db.from('employee_details').upsert({
        user_id: userData.id,
        employee_id: (userData.employeeId || uniqueId).trim().toUpperCase(),
        is_hod: userData.isHod || false,
        department_id: userData.departmentId || null,
      }, { onConflict: 'user_id' });
    } catch (eErr) {
      console.warn('Non-fatal employee_details upsert error:', eErr);
    }
  }

  // Insert/upsert auxiliary student_details if applicable
  if (userData.parentId || userData.role === 'student') {
    const studentRoll = (userData.uniqueId || userData.employeeId || (userData.loginIdentifier && !userData.loginIdentifier.includes('@') ? userData.loginIdentifier : null) || uniqueId).trim().toUpperCase();
    try {
      await db.from('student_details').upsert({
        user_id: userData.id,
        roll: studentRoll,
        guardian_id: userData.guardianId || userData.parentId || null,
        department_id: userData.departmentId || null,
        room_number: userData.hostelRoom || userData.assignedHostel || null,
      }, { onConflict: 'user_id' });
    } catch (sErr) {
      console.warn('Non-fatal student_details upsert error:', sErr);
    }
  }

  await addAudit({
    action: 'USER_CREATED',
    userId: 'system',
    userName: 'System',
    role: 'sysadmin',
    details: `Created new user ${userData.id} with role ${userData.role}`,
  });

  return data ? mUser(data) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback */ }

  if (isUuid) {
    const { data, error } = await client.from('users').select('*, employee_details(*), student_details(*)').eq('id', id).maybeSingle();
    if (!error && data) return mUser(data);
  }

  const { data: uData } = await client.from('users').select('*, employee_details(*), student_details(*)').eq('unique_id', id).maybeSingle();
  if (uData) return mUser(uData);

  return null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*, employee_details(*)')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return mUser(data);
}

export async function findUserByLogin(login: string): Promise<User | null> {
  return findUserByEmail(login);
}

// NOTE: `verifyLogin` was REMOVED. Password verification belongs exclusively
// to Supabase Auth (`signInWithPassword`) — application code must never
// authenticate users by merely looking up a row.

/** Verify an operator PIN against the bcrypt-hashed `initial_pin_hash`. */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const { data, error } = await getDbClient().from('users').select('initial_pin_hash').eq('id', userId).single();
  if (error || !data || !data.initial_pin_hash) return false;
  return await bcrypt.compare(pin, data.initial_pin_hash);
}

export async function hashPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

/* ------------------------------------------------------------------ *
 *  THUMBPRINT / BIOMETRIC VERIFICATION
 * ------------------------------------------------------------------ */

/** Registration-time helper: bcrypt-hash a thumbprint signature (cost 10). */
export async function hashThumbprint(signature: string): Promise<string> {
  return bcrypt.hash(signature, 10);
}

/**
 * Store a new thumbprint hash for a user. Uses the service client so the
 * write bypasses RLS (only server routes should call this). Never persist
 * the raw biometric — hash it first with `hashThumbprint`.
 */
export async function registerThumbprint(userId: string, hash: string): Promise<boolean> {
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  const { error } = await client
    .from('users')
    .update({ thumbprint_hash: hash, thumbprint_verified_at: new Date().toISOString() })
    .eq('id', userId);
  return !error;
}

/** Remove a user's stored thumbprint. */
export async function clearThumbprint(userId: string): Promise<boolean> {
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  const { error } = await client
    .from('users')
    .update({ thumbprint_hash: null, thumbprint_verified_at: null })
    .eq('id', userId);
  return !error;
}

/**
 * Look up a user's stored thumbprint hash. Returns `null` when the user
 * doesn't exist or has no thumbprint registered — that's the operator
 * "thumbprint not in database" fallback case.
 */
export async function getThumbprint(userId: string): Promise<{
  hash: string;
  name: string;
  uniqueId: string;
} | null> {
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  const { data, error } = await client
    .from('users')
    .select('thumbprint_hash, name, unique_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data || !data.thumbprint_hash) return null;
  return {
    hash: data.thumbprint_hash,
    name: data.name ?? 'Unknown',
    uniqueId: data.unique_id ?? userId,
  };
}

export async function updateAccountStatus(userId: string, newStatus: AccountStatus): Promise<boolean> {
  const db = getDbClient();
  const { data: user } = await db.from('users').select('name, status').eq('id', userId).single();
  const { error } = await db.from('users').update({ status: newStatus }).eq('id', userId);
  if (error) return false;

  await addAudit({
    action: 'USER_STATUS_UPDATED',
    userId: 'system',
    userName: 'System',
    role: 'sysadmin' as Role,
    details: `Updated status for user ${user?.name ?? userId} from ${user?.status} to ${newStatus}`,
  });

  // Revoke all Supabase Auth sessions so the status change takes effect
  // immediately (e.g., locking an account kicks the user out).
  const revoked = await invalidateAllUserSessions(userId);
  if (!revoked) {
    console.error(`Failed to revoke sessions for user ${userId} after status change`);
  }

  return true;
}

export async function updateUserRole(userId: string, newRole: Role, actorId: string): Promise<boolean> {
  const db = getDbClient();
  const { data: user } = await db.from('users').select('name, role').eq('id', userId).single();
  const { data: actor } = await db.from('users').select('name, role').eq('id', actorId).maybeSingle();

  // SECURITY GUARD: Only sysadmin (or system processes) can assign sysadmin role
  if (newRole === 'sysadmin' && actorId !== 'system' && actor?.role !== 'sysadmin') {
    console.error(`Forbidden role escalation attempt: actor ${actorId} (${actor?.role}) tried to grant sysadmin to ${userId}`);
    return false;
  }

  const { error } = await db.from('users').update({ role: newRole }).eq('id', userId);
  if (error) return false;

  await addAudit({
    action: 'USER_ROLE_UPDATED',
    userId: actorId,
    userName: actor?.name ?? 'Unknown',
    role: 'admin',
    details: `Updated role for user ${user?.name ?? userId} from ${user?.role} to ${newRole}`,
  });

  // Revoke all Supabase Auth sessions so stale tokens cannot keep exercising
  // the old role (role changes require re-authentication).
  const revoked = await invalidateAllUserSessions(userId);
  if (!revoked) {
    console.error(`Failed to revoke sessions for user ${userId} after role change`);
  }

  return true;
}

// NOTE: `revokeAllSessions` (legacy custom-sessions table) was REMOVED.
// Session revocation is handled by `invalidateAllUserSessions` in
// '@/lib/dbClient', which calls Supabase Auth's Admin signOut API.

/* ------------------------------------------------------------------ *
 *  SCAN & LOG LOGIC
 * ------------------------------------------------------------------ */

export async function lastScanFor(uniqueId: string): Promise<Scan | null> {
  const formattedId = sanitizePostgrestParam(uniqueId).toUpperCase();
  // Use service client to bypass RLS
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }
  const { data, error } = await client
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey!inner(*)')
    .eq('users.unique_id', formattedId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mScan(data);
}

export async function scansToday(): Promise<Scan[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey(*)')
    .gte('timestamp', todayStart.toISOString())
    .order('timestamp', { ascending: false });

  if (error || !data) return [];
  return data.map(mScan);
}

export async function personsInside(): Promise<Person[]> {
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback */ }

  const { data, error } = await client
    .from('campus_occupancy')
    .select('*, users(*)')
    .eq('current_status', 'IN');

  if (error || !data) return [];
  return data.map((d: any) => mPerson(d.users));
}

export const studentsInside = personsInside;

export async function campusCount(): Promise<number> {
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback */ }

  const { count, error } = await client
    .from('campus_occupancy')
    .select('*', { count: 'exact', head: true })
    .eq('current_status', 'IN');

  if (error || count === null) return 0;
  return count;
}

export async function isDuplicate(uniqueId: string, direction: ScanDirection, windowSeconds = 5): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const formattedId = uniqueId.trim().toUpperCase();

  // Use service client to bypass RLS
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  const { data, error } = await client
    .from('movement_logs')
    .select('id, users:users!movement_logs_user_id_fkey!inner(unique_id)')
    .eq('users.unique_id', formattedId)
    .eq('direction', direction)
    .gte('timestamp', cutoff)
    .limit(1);

  if (error || !data) return false;
  return data.length > 0;
}

export async function inferDirection(uniqueId: string): Promise<ScanDirection> {
  const l = await lastScanFor(uniqueId);
  if (!l) return "IN";
  return l.direction === "IN" ? "OUT" : "IN";
}

export async function addScan(input: {
  roll: string; // unique_id / roll
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  operatorId: string;
  isManual?: boolean;
  clientEventId?: string;
}): Promise<{ scan: Scan; duplicate: boolean }> {
  const uniqueId = input.roll.trim().toUpperCase();

  const person = await findPersonByUniqueId(uniqueId);
  if (!person) {
    throw new Error(`Person not found with ID: ${uniqueId}`);
  }

  if (person.status && person.status.toUpperCase() !== "ACTIVE") {
    throw new Error(`Access Denied: Account status is ${person.status}. Gate access denied.`);
  }

  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback */ }

  if (input.reason) {
    const reasonAliasMap: Record<string, string> = {
      "day_pass": "day_pass",
      "home_out": "home_out",
      "Day Out": "day_pass",
      "Home Out": "home_out",
      "Daily Outing": "daily_outing",
    };
    const normReason = reasonAliasMap[input.reason] || input.reason;
    const { data: validReason, error: rErr } = await client
        .from('config_exit_reasons')
        .select('code')
        .in('code', [input.reason, normReason, 'day_pass', 'home_out', 'daily_outing'])
        .maybeSingle();
    
    if (!validReason && (!rErr || (rErr.code !== '42P01' && rErr.code !== 'PGRST205'))) {
      // If table is missing or doesn't match, allow standard pass reasons (day_pass, home_out, daily_outing)
      const allowedStandard = ['day_pass', 'home_out', 'daily_outing', 'Day Out', 'Home Out', 'Day Pass', 'Daily Outing'];
      if (!allowedStandard.includes(input.reason)) {
        throw new Error(`Invalid exit reason: ${input.reason}`);
      }
    }
  }

  const isUuid = (str?: string) => !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // DB Idempotency Check via clientEventId
  if (input.clientEventId && isUuid(input.clientEventId)) {
    const { data: existingLog } = await client
      .from('movement_logs')
      .select('*, users:users!movement_logs_user_id_fkey(*)')
      .eq('id', input.clientEventId)
      .maybeSingle();

    if (existingLog) {
      return { scan: mScan(existingLog), duplicate: true };
    }
  }

  const gate = await findGateById(input.gateId);
  if (!gate) throw new Error("Invalid gate ID");

  const op = await findUserById(input.operatorId);
  if (!op) throw new Error("Invalid operator ID");

  const ts = new Date().toISOString();
  const id = (input.clientEventId && isUuid(input.clientEventId)) ? input.clientEventId : crypto.randomUUID();

  // Attempt atomic database scan insertion via stored RPC with row lock
  try {
    const { data: rpcRes, error: rpcErr } = await client.rpc('process_gate_scan', {
      p_scan_id: id,
      p_user_id: person.id,
      p_direction: input.direction,
      p_reason: input.reason || null,
      p_gate_id: gate.id,
      p_gate_name: gate.name,
      p_operator_id: op.id,
      p_operator_name: op.name,
      p_timestamp: ts,
      p_is_manual: !!input.isManual,
      p_dup_window_minutes: 5,
    });

    if (!rpcErr && rpcRes && rpcRes.length > 0) {
      const res = rpcRes[0];
      const logData = res.inserted_log;
      const isDup = !!res.is_duplicate;
      return { scan: mScan({ ...logData, users: person }), duplicate: isDup };
    }
  } catch { /* fallback to standard query path if RPC is missing */ }

  const duplicate = await isDuplicate(uniqueId, input.direction);
  if (duplicate) {
    const last = await lastScanFor(uniqueId);
    if (last) {
      return { scan: last, duplicate: true };
    }
  }

  const dbScanReasonMap: Record<string, string> = {
    "day_pass": "Day Out",
    "home_out": "Home Out",
    "daily_outing": "Daily Outing",
  };
  const scanReason = input.reason ? (dbScanReasonMap[input.reason] || input.reason) : "Regular";

  const scanRow = {
    id,
    user_id: person.id,
    direction: input.direction,
    reason: scanReason,
    gate_id: gate.id,
    gate_name: gate.name,
    operator_id: op.id,
    operator_name: op.name,
    timestamp: ts,
    is_manual: !!input.isManual,
    is_correction: false,
  };

  const { data, error } = await client.from('movement_logs').insert(scanRow).select('*, users:users!movement_logs_user_id_fkey(*)').single();
  if (error || !data) {
    if (error?.code === '23505') {
      const { data: existingLog } = await client
        .from('movement_logs')
        .select('*, users:users!movement_logs_user_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();
      if (existingLog) {
        return { scan: mScan(existingLog), duplicate: true };
      }
    }
    console.error('Error inserting scan:', error);
    throw new Error(`Failed to log scan: ${error?.message}`);
  }

  // Note: campus_occupancy is automatically updated by the trigger update_campus_occupancy_on_movement()
  // when a record is inserted into movement_logs. No manual upsert needed.

  await addAudit({
    action: "SCAN_CREATED",
    userId: op.id,
    userName: op.name,
    role: op.role as Role,
    details: `${input.direction} ${person.fullName} (${person.uniqueId}) [${person.personType}] at ${gate.name}`,
    gateId: gate.id,
  });

  if (person.parentId) {
    await addNotification(
      "parent",
      person.parentId,
      "gate_entry",
      "Gate Entry",
      `${person.fullName} (${person.uniqueId}) ${input.direction === "IN" ? "entered" : "exited"} campus at ${new Date(ts).toLocaleTimeString()} via ${gate.name}`
    );
  }

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
  personType?: string;
  page?: number;
  limit?: number;
}) {
  let query = supabase
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey!inner(name, role, unique_id, department_id, student_details:student_details!student_details_user_id_fkey(year))', { count: 'exact' });

  if (f?.gateId) query = query.eq('gate_id', f.gateId);
  if (f?.direction) query = query.eq('direction', f.direction);
  if (f?.reason) query = query.eq('reason', f.reason);
  if (f?.personType) {
    const roleValue = f.personType === 'parent' ? 'guardian' : f.personType;
    query = query.eq('users.role', roleValue);
  }

  if (f?.search) {
    const s = f.search.trim();
    query = query.or(`name.ilike.%${s}%,unique_id.ilike.%${s}%,department_id.ilike.%${s}%`, { foreignTable: 'users' });
  }

  if (f?.date) {
    const start = new Date(f.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(f.date);
    end.setHours(23, 59, 59, 999);
    query = query.gte('timestamp', start.toISOString()).lte('timestamp', end.toISOString());
  } else {
    if (f?.from) query = query.gte('timestamp', f.from);
    if (f?.to) query = query.lte('timestamp', f.to);
  }

  query = query.order('timestamp', { ascending: false });

  const page = f?.page || 1;
  const limit = f?.limit || 50;
  const fromIdx = (page - 1) * limit;
  const toIdx = fromIdx + limit - 1;

  query = query.range(fromIdx, toIdx);

  const { data, error, count } = await query;
  if (error) {
    console.error('Error fetching gate logs:', error);
    return { logs: [], total: 0, pages: 0, page, limit };
  }

  const logs = (data || []).map(mScan);
  const total = count || 0;
  const pages = Math.ceil(total / limit);

  return { logs, total, pages, page, limit };
}

/* ------------------------------------------------------------------ *
 *  AUDIT LOGS & NOTIFICATIONS
 * ------------------------------------------------------------------ */

export async function addAudit(entry: {
  action: string;
  userId: string;
  userName?: string;
  role?: Role;
  details: string | Record<string, any>;
  gateId?: string;
}) {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const timestamp = new Date().toISOString();
  const detailsStr = typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details);

  const { getSupabaseServiceClient } = await import('./dbClient');
  const serviceClient = getSupabaseServiceClient();

  let targetUserId: string | null = null;
  if (typeof entry.userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.userId)) {
    const { data: userExists } = await serviceClient.from('users').select('id').eq('id', entry.userId).maybeSingle();
    if (userExists) targetUserId = entry.userId;
  }

    const auditRow = {
    action: entry.action,
    user_id: targetUserId,
    user_name: entry.userName || "System User",
    user_role: entry.role || null,
    details: detailsStr,
    timestamp,
  };

  let { error } = await serviceClient.from('audit_logs').insert(auditRow);
  if (error && error.code === 'PGRST204') {
    // Schema drift safety net: drop any unknown columns and retry.
    delete (auditRow as any).user_role;
    const retry = await serviceClient.from('audit_logs').insert(auditRow);
    error = retry.error;
  }
  if (error && error.code === '23503') {
    auditRow.user_id = null;
    await serviceClient.from('audit_logs').insert(auditRow);
  } else if (error) {
    console.error('Error inserting audit log:', error);
  }
}

export async function addNotification(
  recipientType: string,
  recipientId: string,
  type: string,
  title: string,
  message: string,
  gateId?: string
) {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const timestamp = new Date().toISOString();

  const validRecipientType = (['user', 'role', 'department', 'parent', 'guardian', 'all'].includes(recipientType) ? recipientType : 'user') as any;

  const notifRow = {
    id,
    type: type || 'system',
    priority: 'medium',
    title,
    message,
    recipient_id: recipientId || 'all',
    recipient_type: validRecipientType,
    channels: ['in_app'],
    data: gateId ? { gate_id: gateId } : {},
    read: false,
    created_at: timestamp,
  };

  const { error } = await getDbClient().from('notifications').insert(notifRow);
  if (error) {
    console.error('Error creating notification:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  DASHBOARD & STATS
 * ------------------------------------------------------------------ */

// CEJ-88 fix: dashboard() now accepts an optional gateId so callers can
// scope the scan/trend queries and the per-gate locations list to a single
// gate. When gateId is omitted the behaviour stays campus-wide.
export async function dashboard(gateId?: string | null): Promise<DashboardData> {
  const db = getDbClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  // CEJ-88/89 fix: movement_logs has no person_type/department columns —
  // embed the joined user (mScan expects r.users) instead of selecting
  // non-existent columns, and scope every scan query to the requested gate.
  let todayScansBuilder: any = db.from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey!inner(unique_id, name, role, department_id, student_details:student_details!student_details_user_id_fkey(year))')
    .gte('timestamp', todayStart.toISOString());
  let yesterdayInBuilder: any = db.from('movement_logs')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', yesterdayStart.toISOString())
    .lt('timestamp', todayStart.toISOString())
    .eq('direction', 'IN');
  let yesterdayOutBuilder: any = db.from('movement_logs')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', yesterdayStart.toISOString())
    .lt('timestamp', todayStart.toISOString())
    .eq('direction', 'OUT');
  if (gateId) {
    todayScansBuilder = todayScansBuilder.eq('gate_id', gateId);
    yesterdayInBuilder = yesterdayInBuilder.eq('gate_id', gateId);
    yesterdayOutBuilder = yesterdayOutBuilder.eq('gate_id', gateId);
  }

  const [
    onCampusCount,
    todayScansRes,
    yesterdayInRes,
    yesterdayOutRes,
    activeAlertsRes,
    allGates,
    userRolesRes,
  ] = await Promise.all([
    campusCount(),
    todayScansBuilder
      .order('timestamp', { ascending: false })
      .limit(2000),
    yesterdayInBuilder,
    yesterdayOutBuilder,
    db.from('alerts')
      .select('*')
      .eq('resolved', false)
      .order('timestamp', { ascending: false })
      .limit(50),
    getAllGatesLive(),
    db.from('users').select('role').limit(5000),
  ]);

  const todayScans = (todayScansRes.data || []).map(mScan);
  const activeAlerts = (activeAlertsRes.data || []).map(mAlert);

  const todayIn = todayScans.filter((s: Scan) => s.direction === "IN").length;
  const todayOut = todayScans.filter((s: Scan) => s.direction === "OUT").length;

  const yesterdayIn = yesterdayInRes.count || 0;
  const yesterdayOut = yesterdayOutRes.count || 0;

  const calcTrend = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? "+100% vs yesterday" : "0% vs yesterday";
    const diff = ((cur - prev) / prev) * 100;
    const sign = diff >= 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}% vs yesterday`;
  };

  // CEJ-88 fix: when a gateId was requested, only list that gate (the page
  // looks up its own gate in this array).
  const gatesForDisplay = gateId
    ? allGates.filter((gate: Gate) => String(gate.id) === String(gateId))
    : allGates;

  const locations = gatesForDisplay.map((gate: Gate) => {
    const gateScans = todayScans.filter((s: Scan) => s.gateId === gate.id);
    const lastScan = gateScans.length > 0 ? gateScans[0] : null;
    return {
      ...gate,
      currentScanCount: gateScans.length,
      lastScan,
    };
  });

  const deptCounts: Record<string, { in: number; out: number; name?: string }> = {};
  DEPARTMENTS.forEach((d) => {
    deptCounts[d.code] = { in: 0, out: 0, name: d.name };
  });

  todayScans.forEach((s: any) => {
    // mScan() returns the department as a full name (or a raw code) — map it
    // back to the DEPARTMENTS code so it matches the deptCounts keys.
    const deptMatch = s.department
      ? DEPARTMENTS.find((d) => d.code === s.department || d.name === s.department)
      : undefined;
    const deptCode = deptMatch?.code || (s.department ? String(s.department).trim().toUpperCase() : undefined);
    const deptName = deptMatch?.name || s.department || "Other";
    if (deptCode) {
      if (!deptCounts[deptCode]) {
        deptCounts[deptCode] = { in: 0, out: 0, name: deptName };
      }
      if (s.direction === "IN") deptCounts[deptCode].in++;
      else deptCounts[deptCode].out++;
    }
  });

  const totalDeptScans = Object.values(deptCounts).reduce(
    (acc, curr) => acc + curr.in + curr.out,
    0
  );

  const deptBreakdown = Object.entries(deptCounts).map(([code, counts]) => {
    const total = counts.in + counts.out;
    const pct = totalDeptScans > 0 ? Math.round((total / totalDeptScans) * 100) : 0;

    return {
      dept: counts.name || code,
      deptCode: code,
      in: counts.in,
      out: counts.out,
      pct,
    };
  });

  // Calculate person type breakdown
  const personTypes: PersonType[] = ["student", "faculty", "staff", "worker", "visitor", "parent"];
  const personTypeBreakdown: Record<PersonType, PersonTypeStats> = {
    student: { total: 0, onCampus: 0, inToday: 0, outToday: 0, attendanceRate: 0 },
    faculty: { total: 0, onCampus: 0, inToday: 0, outToday: 0, attendanceRate: 0 },
    staff: { total: 0, onCampus: 0, inToday: 0, outToday: 0, attendanceRate: 0 },
    worker: { total: 0, onCampus: 0, inToday: 0, outToday: 0, attendanceRate: 0 },
    visitor: { total: 0, onCampus: 0, inToday: 0, outToday: 0, attendanceRate: 0 },
    parent: { total: 0, onCampus: 0, inToday: 0, outToday: 0, attendanceRate: 0 },
  };

  const userRoles = userRolesRes.data || [];
  userRoles.forEach((u: any) => {
    const role = (u.role || 'student') as PersonType;
    if (personTypeBreakdown[role]) {
      personTypeBreakdown[role].total++;
    }
  });

  // Calculate current on-campus counts per type from campus_occupancy
  let occupants: any[] = [];
  try {
    const occRes = await db.from('campus_occupancy').select('user_id').eq('current_status', 'IN');
    occupants = occRes.data || [];
  } catch (occErr) {
    console.error('[dashboard] Error fetching campus occupants:', occErr);
    occupants = [];
  }

  if (occupants.length > 0) {
    const occupantIds = occupants.map((o: any) => o.user_id);
    const { data: occRoles } = await db.from('users').select('role').in('id', occupantIds);
    (occRoles || []).forEach((u: any) => {
      const role = (u.role || 'student') as PersonType;
      if (personTypeBreakdown[role]) {
        personTypeBreakdown[role].onCampus++;
      }
    });
  }

  todayScans.forEach((s: any) => {
    const type = (s.personType || "student") as PersonType;
    if (personTypeBreakdown[type]) {
      if (s.direction === "IN") personTypeBreakdown[type].inToday++;
      else personTypeBreakdown[type].outToday++;
    }
  });

  // Compute attendance rates per type
  Object.keys(personTypeBreakdown).forEach((k) => {
    const key = k as PersonType;
    const stats = personTypeBreakdown[key];
    stats.attendanceRate = stats.total > 0
      ? Math.round((Math.max(stats.onCampus, stats.inToday) / stats.total) * 100)
      : 0;
  });

  const facultyStats = personTypeBreakdown.faculty;
  const totalFaculty = facultyStats.total || 0;
  const onCampusFaculty = facultyStats.onCampus || 0;
  const facultyMetrics = {
    totalFaculty,
    onCampus: onCampusFaculty,
    inToday: facultyStats.inToday || 0,
    outToday: facultyStats.outToday || 0,
    attendancePercentage: totalFaculty > 0 
      ? Math.round((onCampusFaculty / totalFaculty) * 100) 
      : 0,
  };

  const passes = await findGatePasses({ limit: 10 });

  return {
    onCampus: onCampusCount,
    todayIn,
    todayOut,
    totalScans: todayScans.length,
    activeAlerts: activeAlerts.length,
    trendOnCampus: calcTrend(onCampusCount, yesterdayIn - yesterdayOut),
    trendOut: calcTrend(todayOut, yesterdayOut),
    trendScans: calcTrend(todayScans.length, yesterdayIn + yesterdayOut),
    locations,
    activityFeed: todayScans.slice(0, 20),
    deptBreakdown,
    personTypeBreakdown,
    facultyMetrics,
    alerts: activeAlerts,
    gatePasses: passes,
  };
}

// --------------------------------------------------------------------------- *
// DAILY GATE STATS (per-day table that resets each new day at midnight)
// --------------------------------------------------------------------------- *

/**
 * Read per-day gate stats from the `daily_stats` table.
 *
 * The table holds one row per (date, gate). Because rows are keyed by date, a
 * scan after local midnight creates a fresh row — today's entries/exits start
 * at zero while all historical days remain recorded.
 *
 * @param date YYYY-MM-DD; defaults to today (UTC day, matching the table rows)
 * @param gateId optional gate UUID to scope; omitted = all gates summary
 */
export async function getDailyStats(date?: string, gateId?: string): Promise<DailyGateStats | DailyGateStats[] | null> {
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  const day = date || new Date().toISOString().slice(0, 10);

  let query = client
    .from('daily_stats')
    .select('date, gate_id, gate_code, entries, exits, peak_hour, peak_count, on_campus_last, updated_at')
    .eq('date', day);

  if (gateId) query = query.eq('gate_id', gateId);

  const { data, error } = await query;
  if (error || !data) return null;

  const rows: DailyGateStats[] = data.map((r: any) => ({
    date: r.date,
    gateId: r.gate_id,
    gateCode: r.gate_code,
    entries: Number(r.entries || 0),
    exits: Number(r.exits || 0),
    peakHour: r.peak_hour ?? undefined,
    peakCount: r.peak_count ?? undefined,
    onCampusLast: r.on_campus_last ?? undefined,
    updatedAt: r.updated_at,
  }));

  return gateId ? (rows[0] ?? null) : rows;
}

export async function statsToday(gateId?: string): Promise<{
  entries: number;
  exits: number;
  onCampus: number;
  lastScan: Scan | null;
  recentScans: Scan[];
  personTypeBreakdown: Record<PersonType, PersonTypeStats>;
}> {
  // Use a single UTC day boundary for both the daily_stats lookup and the
  // movement_logs fallback so the counters stay perfectly in sync with the
  // analytics routes (which also use UTC day boundaries).
  const day = new Date().toISOString().slice(0, 10);
  const dayStartUTC = `${day}T00:00:00.000Z`;

  // Read scan history from movement_logs (the active table writes go to).
  // The legacy "gate_logs" table is not written to anymore, so reading from
  // it always returned zero entries/exits.
  let todayScansQuery = supabase
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey(name, role, unique_id, department_id)')
    .gte('timestamp', dayStartUTC)
    .order('timestamp', { ascending: false });

  // Scope to the operator's gate when one is provided.
  if (gateId) {
    todayScansQuery = todayScansQuery.eq('gate_id', gateId);
  }

  const [todayScansRes, onCampusCount, allPersons] = await Promise.all([
    todayScansQuery,
    campusCount(),
    findAllPersons(),
  ]);

  const todayScans = (todayScansRes.data || []).map(mScan);

  // Prefer the authoritative per-day `daily_stats` counter (auto-reset at
  // midnight) when a row exists; otherwise fall back to a live computation
  // from today's movement_logs so the page is never stuck on 0.
  let entries: number;
  let exits: number;
  let dailyRow: DailyGateStats | DailyGateStats[] | null = null;
  try {
    dailyRow = await getDailyStats(day, gateId);
  } catch { /* daily_stats may not be migrated on this DB yet; fall through */ }
  const row = Array.isArray(dailyRow) ? dailyRow[0] : dailyRow;
  if (row) {
    entries = row.entries;
    exits = row.exits;
  } else {
    entries = todayScans.filter((s: any) => s.direction === 'IN').length;
    exits = todayScans.filter((s: any) => s.direction === 'OUT').length;
  }
  const lastScan = todayScans.length > 0 ? todayScans[0] : null;

  const personTypeBreakdown: Record<PersonType, PersonTypeStats> = {
    student: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    faculty: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    staff: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    worker: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    visitor: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    parent: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
  };

  allPersons.forEach((p: any) => {
    const pType = p.personType as PersonType;
    if (personTypeBreakdown[pType]) {
      personTypeBreakdown[pType].total++;
    }
  });

  todayScans.forEach((s: any) => {
    const type = (s.personType || "student") as PersonType;
    if (personTypeBreakdown[type]) {
      if (s.direction === "IN") personTypeBreakdown[type].inToday++;
      else personTypeBreakdown[type].outToday++;
    }
  });

  const personMap = new Map<string, any>();
  allPersons.forEach((p: any) => {
    if (p.uniqueId) personMap.set(p.uniqueId.toUpperCase(), p);
  });

  const filteredRecentScans = todayScans.filter((scan: any) => {
    const person = personMap.get(scan.roll?.toUpperCase() || scan.uniqueId?.toUpperCase());
    if (!person) return false;

    if (person.personType === "student") {
      const type = person.studentType || "";
      if (type === "DM" || type === "DF") {
        return true;
      }
      if (type === "HM" || type === "HF") {
        return scan.direction === "OUT";
      }
    }
    return false;
  });

  return {
    entries,
    exits,
    onCampus: onCampusCount,
    lastScan,
    recentScans: filteredRecentScans.slice(0, 10),
    personTypeBreakdown,
  };
}

export async function getPersonStatus(uniqueId: string): Promise<{ status: "IN" | "OUT"; lastScan: Scan | null; name?: string }> {
  const formattedId = uniqueId.trim().toUpperCase();

  // Use service client to bypass RLS — access control is enforced at the API layer
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  // Only include id (UUID) filter when the input looks like a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedId);
  const orFilter = isUuid
    ? `unique_id.eq.${formattedId},id.eq.${formattedId}`
    : `unique_id.eq.${formattedId}`;

  // First get the person by ID using parameterized query
  let person: { id: string; name: string } | null = null;
  if (isUuid) {
    const { data: pById } = await client.from('users').select('id, name').eq('id', formattedId).maybeSingle();
    person = pById;
  }
  if (!person) {
    const { data: pByUniqueId, error: personErr } = await client.from('users').select('id, name').eq('unique_id', formattedId).maybeSingle();
    if (!personErr && pByUniqueId) person = pByUniqueId;
  }

  if (!person) {
    return { status: "OUT", lastScan: null };
  }

  // Query campus_occupancy by user_id (parameterized) — use service client to bypass RLS
  const { data: occupancy, error: occErr } = await client
    .from('campus_occupancy')
    .select('current_status, last_log_id')
    .eq('user_id', person.id)
    .maybeSingle();

  if (occErr) {
    console.error('Error fetching occupancy:', occErr);
  }

  const lastScan = await lastScanFor(formattedId);
  
  return {
    status: occupancy?.current_status === "IN" ? "IN" : "OUT",
    lastScan,
    name: person.name,
  };
}

// Backward compatibility alias
export const getStudentStatus = getPersonStatus;

export async function getPersonHistory(uniqueId: string, limit: number = 20): Promise<Scan[]> {
  const formattedId = sanitizePostgrestParam(uniqueId).toUpperCase();
  // Use service client to bypass RLS
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./dbClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }
  const { data, error } = await client
    .from('movement_logs')
    .select('*, users:users!movement_logs_user_id_fkey!inner(*)')
    .eq('users.unique_id', formattedId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mScan);
}

export const getStudentHistory = getPersonHistory;

export async function getLinkedPersons(parentId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from('student_details')
    .select('user_id, users!student_details_user_id_fkey(*)')
    .eq('guardian_id', parentId);

  if (error || !data) return [];
  return data.map((d: any) => mPerson(d.users));
}

export const getParentChildren = getLinkedPersons;

/* ------------------------------------------------------------------ *
 *  STUDENT FLAGS
 * ------------------------------------------------------------------ */

export type FlagStatus = 'OVERDUE' | 'UNAUTHORIZED_EXIT' | 'NO_GATE_PASS' | 'SUSPENDED' | 'CURFEW_VIOLATION' | 'MANUAL_LOCKDOWN';

/**
 * Set or clear an admin advisory flag on a user.
 * Does NOT affect users.status — purely a gate-alert signal.
 */
export async function setUserFlag(userId: string, flag: FlagStatus, actorId: string): Promise<boolean> {
  const { getSupabaseServiceClient } = await import('./dbClient');
  const service = getSupabaseServiceClient();
  const { data: user } = await service.from('users').select('name').eq('id', userId).single();
  const { error } = await service.from('users').update({ flag_status: flag ?? null }).eq('id', userId);
  if (error) { console.error('setUserFlag error:', error); return false; }
  await addAudit({
    action: flag ? 'USER_FLAG_SET' : 'USER_FLAG_CLEARED',
    userId: actorId,
    userName: 'Admin',
    role: 'admin',
    details: `Flag ${flag ?? 'cleared'} for user ${user?.name ?? userId}`,
  });
  return true;
}

/* ------------------------------------------------------------------ *
 *  LOCKDOWN BROADCASTS
 * ------------------------------------------------------------------ */

export interface Lockdown {
  id: string;
  scopes: string[];
  message: string | null;
  issuedBy: string | null;
  issuedAt: string;
  liftedAt: string | null;
}

function mLockdown(r: any): Lockdown {
  // CEJ-96 fix: lockdown_broadcasts is a generic stub table
  // (id, data JSONB, created_at, updated_at) — every payload column lives
  // inside `data`, not as a real column. Read the JSONB payload instead of
  // non-existent columns (scopes/message/issued_by/issued_at/lifted_at).
  const d = r.data ?? {};
  return {
    id: r.id,
    scopes: d.scopes ?? [],
    message: d.message ?? null,
    issuedBy: d.issued_by ?? null,
    issuedAt: d.issued_at ?? r.created_at,
    liftedAt: d.lifted_at ?? null,
  };
}

/** Returns the currently active lockdown, or null if none. */
export async function getActiveLockdown(): Promise<Lockdown | null> {
  const { getSupabaseServiceClient } = await import('./dbClient');
  const service = getSupabaseServiceClient();
  // CEJ-96 fix: filter/order on real columns (created_at) and pick the most
  // recent non-lifted row from the data JSONB payload.
  const { data, error } = await service
    .from('lockdown_broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25);
  if (error) { console.error('getActiveLockdown error:', error); return null; }
  const active = (data || []).find((r: any) => !r.data?.lifted_at);
  return active ? mLockdown(active) : null;
}

/** Broadcasts a new lockdown. */
export async function createLockdown(scopes: string[], message: string | null, issuedBy: string): Promise<Lockdown | null> {
  const { getSupabaseServiceClient } = await import('./dbClient');
  const service = getSupabaseServiceClient();
  // CEJ-96 fix: write the lockdown payload into the `data` JSONB column that
  // actually exists on lockdown_broadcasts.
  const issuedAt = new Date().toISOString();
  const { data, error } = await service
    .from('lockdown_broadcasts')
    .insert({
      data: {
        scopes,
        message: message ?? null,
        issued_by: issuedBy,
        issued_at: issuedAt,
        lifted_at: null,
        lifted_by: null,
      },
    })
    .select()
    .single();
  if (error || !data) { console.error('createLockdown error:', error); return null; }
  await addAudit({
    action: 'LOCKDOWN_BROADCAST',
    userId: issuedBy,
    userName: 'Admin',
    role: 'admin',
    details: `Lockdown issued for scopes: ${scopes.join(', ')}`,
  });
  return mLockdown(data);
}

/** Lifts (ends) an active lockdown. */
export async function liftLockdown(lockdownId: string, liftedBy: string): Promise<boolean> {
  const { getSupabaseServiceClient } = await import('./dbClient');
  const service = getSupabaseServiceClient();
  // CEJ-96 fix: merge lifted_at/lifted_by into the existing data JSONB
  // payload (there are no lifted_* columns on the stub table).
  const { data: row, error: fetchErr } = await service
    .from('lockdown_broadcasts')
    .select('*')
    .eq('id', lockdownId)
    .maybeSingle();
  if (fetchErr || !row) { console.error('liftLockdown fetch error:', fetchErr); return false; }
  if (row.data?.lifted_at) { return true; } // already lifted
  const { error } = await service
    .from('lockdown_broadcasts')
    .update({
      data: { ...(row.data || {}), lifted_at: new Date().toISOString(), lifted_by: liftedBy },
      updated_at: new Date().toISOString(),
    })
    .eq('id', lockdownId);
  if (error) { console.error('liftLockdown error:', error); return false; }
  await addAudit({
    action: 'LOCKDOWN_LIFTED',
    userId: liftedBy,
    userName: 'Admin',
    role: 'admin',
    details: `Lockdown ${lockdownId} lifted`,
  });
  return true;
}

export const provisionProfile = createUser;
