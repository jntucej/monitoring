export type Role =
  | "operator"
  | "supervisor"
  | "admin"
  | "sysadmin"
  | "parent"
  | "student"
  | "warden";

export type AccountStatus = "ACTIVE" | "LOCKED" | "SUSPENDED" | "DISABLED" | "DEPROVISIONED";

export interface User {
  id: string;
  name: string;
  role: Role;
  gateId?: string;
  employeeId?: string;
  email?: string;
  phone?: string;
  pin?: string;
  parentId?: string;
  supervisedGates?: string[];
  assignedHostel?: string;
  isHod?: boolean;
  departmentId?: string;
  canViewGender?: string[];
  status: AccountStatus;
}

export type ExitReason = "Home Out" | "Day Out" | "Leave" | "Regular";

export type StudentType = "HM" | "HF" | "DM" | "DF";

export type ScanDirection = "IN" | "OUT";

export interface Student {
  id: string;
  roll: string;
  name: string;
  department: string;
  year: number;
  section: string;
  batch: string;
  photo: string;
  email: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  parentId: string;
  qrCode: string;
  idValidUntil: string;
  status: string;
  studentType?: StudentType;
  gender?: "male" | "female";
  hostelBlock?: string;
  roomNumber?: string;
  hostelCurfewTime?: string;
  wardenId?: string;
}

export interface Department {
  code: string;
  name: string;
  hod: string;
}

export type DepartmentCode = string;

export interface Gate {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
}

export interface Scan {
  id: string;
  roll: string;
  name: string;
  department: string;
  year: number;
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
  alerts: Alert[];
  gatePasses: GatePass[];
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

export const EXIT_REASON_CONFIGS: ExitReasonConfig[] = [
  { code: "Regular", name: "Regular", description: "Regular exit/entry", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: false, parentNotification: "silent" },
  { code: "Home Out", name: "Home Out", description: "Going home for overnight/weekend", applicableTo: ["HM", "HF"], maxDurationHours: 48, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Day Out", name: "Day Out", description: "Full day outing", applicableTo: ["HM", "HF"], maxDurationHours: 8, requiresApproval: true, approvalBy: "warden", parentNotification: "sms" },
  { code: "Leave", name: "Leave", description: "Leave application (covers medical, events, and other special cases)", applicableTo: ["HM", "HF", "DM", "DF"], requiresApproval: true, approvalBy: "faculty", parentNotification: "push" },
];

export const STUDENT_TYPE_RULES: Record<StudentType, {
  curfew?: string;
  shortOutingMax: number;
  dayOutMax: number;
  homeOutMax: number;
  allowedExitReasons: ExitReason[];
  mustExitBy?: string;
}> = {
  HM: { curfew: "21:00", shortOutingMax: 3, dayOutMax: 8, homeOutMax: 48, allowedExitReasons: ["Regular", "Home Out", "Day Out", "Leave"] },
  HF: { curfew: "18:30", shortOutingMax: 2, dayOutMax: 6, homeOutMax: 48, allowedExitReasons: ["Regular", "Home Out", "Day Out", "Leave"] },
  DM: { shortOutingMax: 0, dayOutMax: 0, homeOutMax: 0, allowedExitReasons: ["Regular", "Leave"], mustExitBy: "17:30" },
  DF: { shortOutingMax: 0, dayOutMax: 0, homeOutMax: 0, allowedExitReasons: ["Regular", "Leave"], mustExitBy: "17:30" },
};

export const DEPARTMENT_CODES: Record<string, string> = {
  "01": "CSE",
  "02": "IT",
  "03": "ECE",
  "04": "EEE",
  "05": "ME",
};

export const DEPARTMENT_CODE_TO_NAME: Record<string, string> = {
  "01": "Computer Science & Engineering",
  "02": "Information Technology",
  "03": "Electronics & Communication Engineering",
  "04": "Electrical & Electronics Engineering",
  "05": "Mechanical Engineering",
};