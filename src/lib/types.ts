export type UUID = string & { readonly __brand: unique symbol };
export type RollNumber = string & { readonly __brand: unique symbol };

export type Role =
  | "operator"
  | "admin"
  | "sysadmin"
  | "supervisor"
  | "guardian" // unified role for parents/guardians of wards
  | "parent" // @deprecated legacy alias kept for schema/code coherence
  | "hod"
  | "student"
  | "warden"
  | "faculty"
  | "staff"
  | "worker"
  | "visitor";

export type AccountStatus = "ACTIVE" | "LOCKED" | "SUSPENDED" | "DISABLED" | "DEPROVISIONED";

export type PersonType = "student" | "faculty" | "staff" | "worker" | "visitor" | "parent";

export interface StudentDetails {
  personId: string;
  roll: string;
  year?: number;
  section?: string;
  batch?: string;
  /** @deprecated use guardianId */
  parentId?: string;
  /** Guardian (parent/ward caretaker) user id */
  guardianId?: string;
  studentType?: StudentType;
  hostelBlock?: string;
  roomNumber?: string;
  hostelCurfewTime?: string;
  gender?: "male" | "female";
  wardenId?: string;
}

export interface EmployeeDetails {
  personId: string;
  employeeId: string;
  designation?: string;
  joiningDate?: string;
  isHod?: boolean;
  departmentId?: string;
}

export interface VisitorLog {
  id: string;
  personId: string;
  checkInAt: string;
  checkOutAt?: string;
  hostPersonId?: string;
  purpose?: string;
  status: "active" | "completed";
}

export interface Person {
  id: string;
  uniqueId: string;
  fullName: string;
  personType: PersonType;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  qrCode?: string;
  idValidUntil?: string;
  status: string;
  visitorHost?: string;
  visitorPurpose?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** True when a thumbprint (biometric) is registered for this person */
  /** Administrative flag status: null | "NONE" | "FLAGGED" | "SUSPENDED" */
  flagStatus?: string | null;
  // Related details if loaded
  studentDetails?: StudentDetails;
  employeeDetails?: EmployeeDetails;
  // Backwards compatibility aliases/flattened fields
  roll?: string;
  name?: string;
  photo?: string;
  year?: number;
  section?: string;
  batch?: string;
  parentName?: string;
  parentPhone?: string;
  parentId?: string;
  guardianId?: string;
  studentType?: StudentType;
  gender?: "male" | "female";
  hostelBlock?: string;
  roomNumber?: string;
  hostelCurfewTime?: string;
  wardenId?: string;
}

// Keep Student interface for backwards compatibility (extends/aliases Person)
export type Student = Person;

export interface User {
  id: string;
  /** Fixed identifying detail (roll / employee id / phone) for lookup */
  uniqueId?: string;
  /** Friendly unique login handle */
  handle?: string;
  /** Active session token for single-device verification */
  currentSessionToken?: string;
  name: string;
  role: Role;
  gateId?: string;
  employeeId?: string;
  email?: string;
  phone?: string;
  pin?: string;
  /** @deprecated use guardianId */
  parentId?: string;
  /** Guardian (parent/ward caretaker) links to student_details.guardian_id */
  guardianId?: string;
  supervisedGates?: string[];
  assignedHostel?: string;
  isHod?: boolean;
  departmentId?: string;
  photoUrl?: string;
  avatarUrl?: string;
  identifier?: string;
  passwordHash?: string;
  canViewGender?: string[];
  status: AccountStatus;
  personType?: PersonType;
  /** Joined student_details row (present when fetched with student_details(*)) */
  studentDetails?: StudentDetails;
  /** Joined employee_details row (present when fetched with employee_details(*)) */
  employeeDetails?: EmployeeDetails;
  /** bcrypt hash of the user's thumbprint/biometric signature (never raw) */
  /** When the thumbprint was last registered */
}

export type ExitReason = "Home Out" | "Day Out" | "Leave" | "Regular";

// ---- Operator dashboard: category breakdown & outing tracking -------------
export type PersonCategoryKey =
  | "hostellers"
  | "dayscholars"
  | "facultyStaff"
  | "authorities"
  | "visitors"
  | "others";

export interface CategoryStat {
  /** People currently inside campus right now */
  inside: number;
  /** IN scans today */
  inToday: number;
  /** OUT scans today */
  outToday: number;
}

export type CategoryBreakdown = Record<PersonCategoryKey, CategoryStat>;

/** A person currently out on a no-permission short outing ("Day Out"). */
export interface OutingEntry {
  userId: string;
  name: string;
  roll: string;
  category: PersonCategoryKey;
  reason: string | null;
  outAt: string;
  minutesGone: number;
  limitMinutes: number;
  overdue: boolean;
}


export type StudentType = "HM" | "HF" | "DM" | "DF";

export type ScanDirection = "IN" | "OUT";

export interface Scan {
  id: string;
  roll: string; // unique_id / roll
  uniqueId: string;
  name: string;
  personType: PersonType;
  department?: string;
  year?: number;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  gateName: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
  isManual: boolean;
  isCorrection: boolean;
  originalScanId?: string;
  personId?: string;
  student_photo?: string;
}

export type ScanLog = Scan;

/**
 * One row of the `daily_stats` table.
 * Tracking per-day entries/exits per gate; rolls to a fresh row at midnight
 * (new date), so historical days persist while today's counters start at 0.
 */
export interface DailyGateStats {
  date: string; // YYYY-MM-DD
  gateId: string;
  gateCode?: string;
  entries: number;
  exits: number;
  peakHour?: number;
  peakCount?: number;
  onCampusLast?: number;
  updatedAt?: string;
}

export interface GatePass {
  id: string;
  roll: string;
  studentName: string;
  department: string;
  reason: ExitReason;
  from: string;
  to: string;
  description?: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  parentStatus: GatePassStatus;
  adminStatus: GatePassStatus;
  finalStatus: GatePassStatus;
  parentComment?: string;
  adminComment?: string;
  parentApproverId?: string;
  adminApproverId?: string;
  qrCode: string;
}

export type GatePassStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPROVED_PARENT" | "APPROVED_ADMIN" | "COMPLETED";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  gateId?: string;
  studentRoll?: string;
  timestamp: string;
  resolved: boolean;
}

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  role: Role;
  timestamp: string;
  details: string;
  gateId?: string;
}

export interface Department {
  code: string;
  name: string;
  hod: string;
}

export type DepartmentCode = string;

export interface Gate {
  id: string;
  gateCode?: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
}

export interface PersonTypeStats {
  total: number;
  onCampus: number;
  inToday: number;
  outToday: number;
  attendanceRate?: number;
}

export interface CampusStatusCardConfig {
  type: PersonType;
  label: string;
  icon: string;
  color: string;
  stats: PersonTypeStats;
  href: string;
  footer: string;
}

export interface DashboardData {
  onCampus: number;
  todayIn: number;
  todayOut: number;
  totalScans: number;
  activeAlerts: number;
  trendOnCampus: string;
  trendOut: string;
  trendScans: string;
  locations: Array<Gate & { currentScanCount: number; lastScan: Scan | null }>;
  activityFeed: Scan[];
  deptBreakdown: Array<{
    dept: string;
    deptCode: DepartmentCode;
    in: number;
    out: number;
    pct: number;
  }>;
  personTypeBreakdown: Record<PersonType, PersonTypeStats>;
  alerts: Alert[];
  gatePasses: GatePass[];
  facultyMetrics?: {
    totalFaculty: number;
    onCampus: number;
    inToday: number;
    outToday: number;
    attendancePercentage: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ExitReasonConfig {
  code: ExitReason;
  name: string;
  description: string;
  applicableTo: StudentType[];
  maxDurationHours?: number;
  requiresApproval: boolean;
  approvalBy?: "warden" | "faculty" | "admin" | "none";
  parentNotification: "silent" | "push" | "sms" | "urgent";
  autoApproveTimeRange?: string;
}

export const DEPARTMENT_CODES: Record<string, string> = {
  "01": "CSE",
  "02": "EEE",
  "03": "ME",
  "04": "ECE",
  "05": "CSE",
  "12": "IT",
};

export const DEPARTMENT_CODE_TO_NAME: Record<string, string> = {
  "01": "Computer Science & Engineering",
  "02": "Information Technology",
  "03": "Electronics & Communication Engineering",
  "04": "Electrical & Electronics Engineering",
  "05": "Mechanical Engineering",
};

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon, Oct 12"
  status: "ON_TIME" | "LATE" | "ABSENT" | "WEEKEND" | "INSIDE";
  inTime?: string | null;
  outTime?: string | null;
  hours?: number;
}

export interface MovementLogEntry {
  id: string;
  timestamp: string;
  direction: "IN" | "OUT";
  gate: string;
}

export interface FacultyMemberAttendance {
  id: string;
  uniqueId: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  status: "INSIDE" | "OUTSIDE" | "ABSENT";
  firstInTime: string | null;
  lastOutTime: string | null;
  punctualityStatus: "ON_TIME" | "LATE" | "NOT_CHECKED_IN";
  totalHoursToday: string;
  gateLocation: string | null;
  attendanceRate?: number;
  monthlyStats?: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
    avgHoursPerDay: number;
  };
  attendanceHeatmap?: HeatmapDay[];
  recentLogs?: MovementLogEntry[];
}

export interface DepartmentAttendanceSummary {
  department: string;
  totalFaculty: number;
  presentToday: number;
  currentlyInside: number;
  onTimeToday: number;
  lateToday: number;
  attendanceRate: number;
  avgHoursToday: string;
}

