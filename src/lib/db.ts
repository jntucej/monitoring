import { supabase, invalidateAllUserSessions } from './supabaseClient';
import { randomUUID } from "crypto";
import bcrypt from 'bcryptjs';

import type {
  Department, DepartmentCode, Gate, Person, Student, PersonType, StudentDetails, EmployeeDetails, VisitorLog,
  Scan, ScanDirection, ExitReason, GatePass, GatePassStatus, Alert, AlertSeverity, AuditEntry,
  User, DashboardData, Role, AccountStatus, PersonTypeStats
} from "./types";

/* ------------------------------------------------------------------ *
 *  COLLEGE DATA
 * ------------------------------------------------------------------ */
export const COLLEGE = {
  name: "JNTUH CEJ",
  shortName: "JNTUH CEJ",
  address: "JNTUH CEJ, Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501",
  logo: "🏛️",
  accreditation: "NAAC A+ Grade",
  website: "https://jntuhcej.ac.in/",
  principal: "Dr. G. Narsimha",
};

export function sanitizePostgrestParam(val: string): string {
  if (!val) return "";
  return val.replace(/[,()\\'"]/g, "").trim();
}

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
    parentId: r.student_details.parent_id,
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
    department: r.department || r.department_id || undefined,
    designation: r.designation || undefined,
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
    parentId: studentDetails?.parentId || r.parent_id,
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
    status: r.status || "ACTIVE",
    personType: r.person_type || undefined,
    uniqueId: r.unique_id || undefined,
  };
}

function mScan(r: any): Scan {
  const user = r.users; // joined user object
  const student = user?.student_details; // nested student details
  
  const uniqueId = user?.unique_id || r.unique_id || r.roll || "";
  const name = user?.name || r.name || r.person_name || "";
  const personType = user?.role || r.person_type || "student";
  const department = user?.department_id || r.department || undefined;
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
    studentName: r.student_name,
    department: r.department,
    reason: r.reason,
    from: r.from_datetime,
    to: r.to_datetime,
    description: r.description,
    requestedById: r.requested_by_id,
    requestedByName: r.requested_by_name,
    requestedAt: r.requested_at,
    parentStatus: r.parent_status,
    adminStatus: r.admin_status,
    finalStatus: r.final_status,
    parentComment: r.parent_comment,
    adminComment: r.admin_comment,
    parentApproverId: r.parent_approver_id,
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
    studentRoll: r.student_roll,
    timestamp: r.timestamp,
    resolved: !!r.resolved,
  };
}

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
  const updateField = role === 'parent' ? 'parent_status' : 'admin_status';
  const commentField = role === 'parent' ? 'parent_comment' : 'admin_comment';
  const approverField = role === 'parent' ? 'parent_approver_id' : 'admin_approver_id';
  const statusValue = 'APPROVED';

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

  if (approverId) {
    const { data: user } = await supabase.from('users').select('name').eq('id', approverId).single();
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
}): Promise<GatePass | null> {
  const person = await findPersonByUniqueId(passData.roll.trim().toUpperCase());
  if (!person) {
    console.error('Person not found for pass creation:', passData.roll);
    return null;
  }

  const id = `pass-${Date.now()}`;
  const qrCode = `PASS-${id}-${person.uniqueId}-${Date.now()}`;

  const passRow = {
    id,
    roll: person.uniqueId,
    student_name: person.fullName,
    department: person.department || '',
    reason: passData.reason,
    from_datetime: passData.from,
    to_datetime: passData.to,
    description: passData.description || null,
    requested_by_id: passData.requestedById || person.id,
    requested_by_name: passData.requestedByName || person.fullName,
    requested_at: new Date().toISOString(),
    parent_status: 'PENDING',
    admin_status: 'PENDING',
    final_status: 'PENDING',
    qr_code: qrCode,
  };

  const { data, error } = await supabase.from('gate_passes').insert(passRow).select().single();

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
  limit?: number;
}): Promise<GatePass[]> {
  // Use service client to bypass RLS — access control is enforced at the API layer
  const { getSupabaseServiceClient } = await import('./supabaseClient');
  const serviceClient = getSupabaseServiceClient();
  let query = serviceClient.from('gate_passes').select('*');

  if (filters.status) {
    if (filters.status === 'APPROVED') {
      query = query.eq('final_status', 'APPROVED');
    } else if (filters.status === 'PENDING') {
      query = query.in('final_status', ['PENDING', 'APPROVED_PARENT', 'APPROVED_ADMIN']);
    } else if (filters.status === 'REJECTED') {
      query = query.eq('final_status', 'REJECTED');
    } else {
      query = query.eq('final_status', filters.status);
    }
  }

  if (filters.roll) {
    query = query.eq('roll', filters.roll.trim().toUpperCase());
  }

  query = query.order('requested_at', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error finding gate passes:', error);
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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: persistentGates } = await supabase.from('gates').select('*');
  const gateMap = new Map<string, Gate>();

  if (persistentGates) {
    for (const g of persistentGates) {
      gateMap.set(g.id, {
        id: g.id,
        name: g.name,
        location: g.location,
        type: g.type,
        isActive: !!g.is_active,
      });
    }
  } else {
    for (const g of GATES) {
      gateMap.set(g.id, g);
    }
  }

  return Array.from(gateMap.values());
}

export async function getAlerts(resolved?: boolean): Promise<Alert[]> {
  let query = supabase.from('alerts').select('*').order('timestamp', { ascending: false });
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

export async function getNotifications(recipientType: string, recipientId: string): Promise<Alert[]> {
  let query = supabase.from('alerts').select('*').order('timestamp', { ascending: false });

  const safeType = sanitizePostgrestParam(recipientType);
  const safeId = sanitizePostgrestParam(recipientId);

  if (safeType && safeType !== 'all') {
    query = query.or(`recipient_type.eq.${safeType},recipient_type.eq.all`);
  }

  if (safeId) {
    query = query.or(`recipient_id.eq.${safeId},recipient_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map(mAlert);
}

// NOTE: Session lifecycle is fully owned by Supabase Auth (GoTrue).
// The legacy custom `sessions` table functions (`getUserForSession`,
// `createSession`, `invalidateSession`) were removed. To revoke a user's
// sessions, use `invalidateAllUserSessions` from '@/lib/supabaseClient'.

/* ------------------------------------------------------------------ *
 *  UNIFIED PERSONS FUNCTIONS
 * ------------------------------------------------------------------ */

export async function findPersonByUniqueId(uniqueId: string): Promise<Person | null> {
  const formattedId = sanitizePostgrestParam(uniqueId).toUpperCase();

  // Use service client to bypass RLS — access control is enforced at the API layer
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client if service key unavailable (e.g. client-side) */ }

  // Only include id (UUID) filter when the input looks like a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedId);
  const orFilter = isUuid
    ? `unique_id.eq.${formattedId},id.eq.${formattedId}`
    : `unique_id.eq.${formattedId}`;

  // 1. Query `users` table with student_details and employee_details
  const { data: userData } = await client
    .from('users')
    .select('*, student_details!student_details_user_id_fkey(*), employee_details(*)')
    .or(orFilter)
    .maybeSingle();

  if (userData) {
    return mPerson(userData);
  }

  // 2. Query student_details by roll number
  const { data: sDetails } = await client
    .from('student_details')
    .select('*, users!student_details_user_id_fkey(*)')
    .eq('roll', formattedId)
    .maybeSingle();

  if (sDetails && sDetails.users) {
    return mPerson({ ...sDetails.users, student_details: sDetails });
  }

  return null;
}

// Backwards compatibility aliases
export const findStudentByRoll = findPersonByUniqueId;
export const getStudentByRoll = findPersonByUniqueId;
export async function findByQr(payload: string): Promise<Person | null> {
  return findPersonByUniqueId(payload.trim().toUpperCase().replace(/\s+/g, ""));
}

export async function findAllPersons(type?: PersonType): Promise<Person[]> {
  let query = supabase.from('users').select('*, student_details!student_details_user_id_fkey(*), employee_details(*)');
  if (type) {
    query = query.eq('role', type);
  }

  const { data, error } = await query;
  if (error || !data) {
    // Try without joins
    const { data: fallbackData } = await supabase.from('users').select('*');
    return (fallbackData || []).map(mPerson);
  }

  return data.map(mPerson);
}

export const findAllStudents = () => findAllPersons('student');

export async function findPersonsByType(type: PersonType): Promise<Person[]> {
  return findAllPersons(type);
}

export async function searchPersons(q: string, type?: PersonType): Promise<Person[]> {
  const safeQ = sanitizePostgrestParam(q);
  const searchTerm = `%${safeQ.toLowerCase()}%`;
  let query = supabase.from('users').select('*, student_details!student_details_user_id_fkey(*), employee_details(*)');

  if (type) {
    query = query.eq('role', type);
  }

  query = query.or(`name.ilike.${searchTerm},unique_id.ilike.${searchTerm},email.ilike.${searchTerm}`);

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map(mPerson);
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
    name: data.fullName,
    role: 'visitor',
    phone: data.phone || null,
    email: data.email || `${visitorId.toLowerCase()}@visitor.gatekeeper.edu`,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  };

  const { data: newPerson, error } = await supabase.from('users').insert(userRow).select().single();
  if (error || !newPerson) {
    console.error('Error creating visitor:', error);
    return null;
  }

  // Create visitor log
  await supabase.from('visitor_logs').insert({
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

  await supabase.from('visitor_logs').insert({
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
  const { data, error } = await supabase.from('gates').select('*').eq('id', id).single();
  if (error || !data) return GATES.find(g => g.id === id) || null;
  return { id: data.id, name: data.name, location: data.location, type: data.type, isActive: !!data.is_active };
}

export async function findAllGates(): Promise<Gate[]> {
  const { data, error } = await supabase.from('gates').select('*');
  if (error || !data) return GATES;
  return data.map(g => ({ id: g.id, name: g.name, location: g.location, type: g.type, isActive: !!g.is_active }));
}

export async function findAllUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select('*');
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
  supervisedGates?: string[];
  assignedHostel?: string;
  isHod?: boolean;
  departmentId?: string;
  canViewGender?: string[];
  status?: AccountStatus;
  loginIdentifier?: string;
  initialPinHash?: string;
}): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userData.id,
      name: userData.name,
      role: userData.role,
      employee_id: userData.employeeId || null,
      email: userData.email || null,
      phone: userData.phone || null,
      gate_id: userData.gateId || null,
      parent_id: userData.parentId || null,
      supervised_gates: userData.supervisedGates || null,
      assigned_hostel: userData.assignedHostel || null,
      is_hod: userData.isHod || false,
      department_id: userData.departmentId || null,
      can_view_gender: userData.canViewGender || null,
      status: userData.status || 'ACTIVE',
      login_identifier: userData.loginIdentifier || null,
      initial_pin_hash: userData.initialPinHash || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
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
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mUser(data);
}

export async function findUserByLogin(login: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`employee_id.eq.${login.trim()},email.eq.${login.trim()},name.eq.${login.trim()}`)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error || !data) return null;
  return mUser(data);
}

// NOTE: `verifyLogin` was REMOVED. Password verification belongs exclusively
// to Supabase Auth (`signInWithPassword`) — application code must never
// authenticate users by merely looking up a row.

/** Verify an operator PIN against the bcrypt-hashed `initial_pin_hash`. */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.from('users').select('initial_pin_hash').eq('id', userId).single();
  if (error || !data || !data.initial_pin_hash) return false;
  return await bcrypt.compare(pin, data.initial_pin_hash);
}

export async function hashPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

export async function updateAccountStatus(userId: string, newStatus: AccountStatus): Promise<boolean> {
  const { data: user } = await supabase.from('users').select('name, status').eq('id', userId).single();
  const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
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
  const { data: user } = await supabase.from('users').select('name, role').eq('id', userId).single();
  const { data: actor } = await supabase.from('users').select('name').eq('id', actorId).single();

  const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
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
// '@/lib/supabaseClient', which calls Supabase Auth's Admin signOut API.

/* ------------------------------------------------------------------ *
 *  SCAN & LOG LOGIC
 * ------------------------------------------------------------------ */

export async function lastScanFor(uniqueId: string): Promise<Scan | null> {
  const formattedId = sanitizePostgrestParam(uniqueId).toUpperCase();
  // Use service client to bypass RLS
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }
  const { data, error } = await client
    .from('movement_logs')
    .select('*, users!inner(*)')
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
    .select('*, users(*)')
    .gte('timestamp', todayStart.toISOString())
    .order('timestamp', { ascending: false });

  if (error || !data) return [];
  return data.map(mScan);
}

export async function personsInside(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('campus_occupancy')
    .select('*, users(*)')
    .eq('is_inside', true);

  if (error || !data) return [];
  return data.map(d => mPerson(d.users));
}

export const studentsInside = personsInside;

export async function campusCount(): Promise<number> {
  const { count, error } = await supabase
    .from('campus_occupancy')
    .select('*', { count: 'exact', head: true })
    .eq('is_inside', true);

  if (error || count === null) return 0;
  return count;
}

export async function isDuplicate(uniqueId: string, direction: ScanDirection, min = 5): Promise<boolean> {
  const cutoff = new Date(Date.now() - min * 60000).toISOString();
  const formattedId = uniqueId.trim().toUpperCase();

  // Use service client to bypass RLS
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  const { data, error } = await client
    .from('movement_logs')
    .select('id, users!inner(unique_id)')
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
}): Promise<{ scan: Scan; duplicate: boolean }> {
  const uniqueId = input.roll.trim().toUpperCase();

  const person = await findPersonByUniqueId(uniqueId);
  if (!person) {
    throw new Error(`Person not found with ID: ${uniqueId}`);
  }

  const duplicate = await isDuplicate(uniqueId, input.direction);
  if (duplicate) {
    const last = await lastScanFor(uniqueId);
    if (last) {
      return { scan: last, duplicate: true };
    }
  }

  const gate = await findGateById(input.gateId);
  if (!gate) throw new Error("Invalid gate ID");

  const op = await findUserById(input.operatorId);
  if (!op) throw new Error("Invalid operator ID");

  const ts = new Date().toISOString();
  const id = crypto.randomUUID();

  const scanRow = {
    id,
    user_id: person.id,
    direction: input.direction,
    reason: input.reason || null,
    gate_id: gate.id,
    operator_id: op.id,
    timestamp: ts,
    is_manual: !!input.isManual,
    is_correction: false,
  };

  const { data, error } = await supabase.from('movement_logs').insert(scanRow).select('*, users(*)').single();
  if (error || !data) {
    console.error('Error inserting scan:', error);
    throw new Error(`Failed to log scan: ${error?.message}`);
  }

  // Update occupancy — use service client to bypass RLS
  let occClient = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    occClient = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }
  await occClient.from('campus_occupancy').upsert(
    {
      user_id: person.id,
      is_inside: input.direction === 'IN',
      last_log_id: id,
      updated_at: ts,
    },
    { onConflict: 'user_id' }
  );

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
  userName: string;
  role: Role;
  details: string;
  gateId?: string;
}) {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const timestamp = new Date().toISOString();

  const auditRow = {
    id,
    action: entry.action,
    user_id: entry.userId,
    user_name: entry.userName,
    role: entry.role,
    details: entry.details,
    gate_id: entry.gateId || null,
    timestamp,
  };

  const { error } = await supabase.from('audit_logs').insert(auditRow);
  if (error) {
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

  const notifRow = {
    id,
    recipient_type: recipientType,
    recipient_id: recipientId,
    type,
    title,
    message,
    severity: 'low',
    gate_id: gateId || null,
    timestamp,
    resolved: false,
  };

  const { error } = await supabase.from('alerts').insert(notifRow);
  if (error) {
    console.error('Error creating notification:', error);
  }
}

/* ------------------------------------------------------------------ *
 *  DASHBOARD & STATS
 * ------------------------------------------------------------------ */

export async function dashboard(): Promise<DashboardData> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const [
    onCampusCount,
    todayScansRes,
    yesterdayScansRes,
    activeAlertsRes,
    allGates,
    allPersons,
  ] = await Promise.all([
    campusCount(),
    supabase.from('gate_logs').select('*').gte('timestamp', todayStart.toISOString()),
    supabase.from('gate_logs').select('*').gte('timestamp', yesterdayStart.toISOString()).lt('timestamp', todayStart.toISOString()),
    supabase.from('alerts').select('*').eq('resolved', false),
    getAllGatesLive(),
    findAllPersons(),
  ]);

  const todayScans = (todayScansRes.data || []).map(mScan);
  const yesterdayScans = (yesterdayScansRes.data || []).map(mScan);
  const activeAlerts = (activeAlertsRes.data || []).map(mAlert);

  const todayIn = todayScans.filter((s: Scan) => s.direction === "IN").length;
  const todayOut = todayScans.filter((s: Scan) => s.direction === "OUT").length;

  const yesterdayIn = yesterdayScans.filter((s: Scan) => s.direction === "IN").length;
  const yesterdayOut = yesterdayScans.filter((s: Scan) => s.direction === "OUT").length;

  const calcTrend = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? "+100% vs yesterday" : "0% vs yesterday";
    const diff = ((cur - prev) / prev) * 100;
    const sign = diff >= 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}% vs yesterday`;
  };

  const locations = allGates.map((gate: Gate) => {
    const gateScans = todayScans.filter((s: Scan) => s.gateId === gate.id);
    const lastScan = gateScans.length > 0 ? gateScans[0] : null;
    return {
      ...gate,
      currentScanCount: gateScans.length,
      lastScan,
    };
  });

  const deptCounts: Record<string, { in: number; out: number }> = {
    CSE: { in: 0, out: 0 },
    IT: { in: 0, out: 0 },
    ECE: { in: 0, out: 0 },
    EEE: { in: 0, out: 0 },
    ME: { in: 0, out: 0 },
  };

  todayScans.forEach((scan: Scan) => {
    if (scan.department && deptCounts[scan.department]) {
      if (scan.direction === "IN") deptCounts[scan.department].in++;
      else deptCounts[scan.department].out++;
    }
  });

  const totalDeptScans = Object.values(deptCounts).reduce(
    (acc, curr) => acc + curr.in + curr.out,
    0
  );

  const deptBreakdown = DEPARTMENTS.map((dept) => {
    const counts = deptCounts[dept.code] || { in: 0, out: 0 };
    const total = counts.in + counts.out;
    const pct = totalDeptScans > 0 ? Math.round((total / totalDeptScans) * 100) : 0;

    return {
      dept: dept.name,
      deptCode: dept.code,
      in: counts.in,
      out: counts.out,
      pct,
    };
  });

  // Calculate person type breakdown
  const personTypes: PersonType[] = ["student", "faculty", "staff", "worker", "visitor", "parent"];
  const personTypeBreakdown: Record<PersonType, PersonTypeStats> = {
    student: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    faculty: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    staff: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    worker: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    visitor: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    parent: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
  };

  allPersons.forEach((p: Person) => {
    if (personTypeBreakdown[p.personType]) {
      personTypeBreakdown[p.personType].total++;
    }
  });

  todayScans.forEach((s: Scan) => {
    const type = s.personType || "student";
    if (personTypeBreakdown[type]) {
      if (s.direction === "IN") personTypeBreakdown[type].inToday++;
      else personTypeBreakdown[type].outToday++;
    }
  });

  const passes = await findGatePasses({ limit: 10 });

  return {
    onCampus: onCampusCount,
    todayIn,
    todayOut,
    totalScans: todayScans.length,
    activeAlerts: activeAlerts.length,
    trendOnCampus: calcTrend(onCampusCount, yesterdayIn - yesterdayOut),
    trendOut: calcTrend(todayOut, yesterdayOut),
    trendScans: calcTrend(todayScans.length, yesterdayScans.length),
    locations,
    activityFeed: todayScans.slice(0, 20),
    deptBreakdown,
    personTypeBreakdown,
    alerts: activeAlerts,
    gatePasses: passes,
  };
}

export async function statsToday(): Promise<{
  entries: number;
  exits: number;
  onCampus: number;
  lastScan: Scan | null;
  recentScans: Scan[];
  personTypeBreakdown: Record<PersonType, PersonTypeStats>;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayScansRes, onCampusCount, allPersons] = await Promise.all([
    supabase
      .from('gate_logs')
      .select('*')
      .gte('timestamp', todayStart.toISOString())
      .order('timestamp', { ascending: false }),
    campusCount(),
    findAllPersons(),
  ]);

  const todayScans = (todayScansRes.data || []).map(mScan);
  const entries = todayScans.filter((s) => s.direction === 'IN').length;
  const exits = todayScans.filter((s) => s.direction === 'OUT').length;
  const lastScan = todayScans.length > 0 ? todayScans[0] : null;

  const personTypeBreakdown: Record<PersonType, PersonTypeStats> = {
    student: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    faculty: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    staff: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    worker: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    visitor: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
    parent: { total: 0, onCampus: 0, inToday: 0, outToday: 0 },
  };

  allPersons.forEach(p => {
    if (personTypeBreakdown[p.personType]) {
      personTypeBreakdown[p.personType].total++;
    }
  });

  todayScans.forEach(s => {
    const type = s.personType || "student";
    if (personTypeBreakdown[type]) {
      if (s.direction === "IN") personTypeBreakdown[type].inToday++;
      else personTypeBreakdown[type].outToday++;
    }
  });

  return {
    entries,
    exits,
    onCampus: onCampusCount,
    lastScan,
    recentScans: todayScans.slice(0, 10),
    personTypeBreakdown,
  };
}

export async function getPersonStatus(uniqueId: string): Promise<{ status: "IN" | "OUT"; lastScan: Scan | null; name?: string }> {
  const formattedId = uniqueId.trim().toUpperCase();

  // Use service client to bypass RLS — access control is enforced at the API layer
  let client = supabase;
  try {
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }

  // Only include id (UUID) filter when the input looks like a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formattedId);
  const orFilter = isUuid
    ? `unique_id.eq.${formattedId},id.eq.${formattedId}`
    : `unique_id.eq.${formattedId}`;

  // First get the person by ID using parameterized query
  const { data: person, error: personErr } = await client
    .from('users')
    .select('id, name')
    .or(orFilter)
    .maybeSingle();

  if (personErr || !person) {
    // Fallback to legacy students table
    const { data: legacyStudent } = await supabase
      .from('students')
      .select('id, name')
      .eq('roll', formattedId)
      .maybeSingle();
    
    if (legacyStudent) {
      const lastScan = await lastScanFor(formattedId);
      return {
        status: lastScan?.direction === "IN" ? "IN" : "OUT",
        lastScan,
        name: legacyStudent.name,
      };
    }
    
    return { status: "OUT", lastScan: null };
  }

  // Query campus_occupancy by user_id (parameterized) — use service client to bypass RLS
  const { data: occupancy, error: occErr } = await client
    .from('campus_occupancy')
    .select('is_inside, last_log_id')
    .eq('user_id', person.id)
    .maybeSingle();

  if (occErr) {
    console.error('Error fetching occupancy:', occErr);
  }

  const lastScan = await lastScanFor(formattedId);
  
  return {
    status: occupancy?.is_inside ? "IN" : "OUT",
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
    const { getSupabaseServiceClient } = await import('./supabaseClient');
    client = getSupabaseServiceClient();
  } catch { /* fallback to anon client */ }
  const { data, error } = await client
    .from('movement_logs')
    .select('*, users!inner(*)')
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
  return data.map(d => mPerson(d.users));
}

export const getParentChildren = getLinkedPersons;
