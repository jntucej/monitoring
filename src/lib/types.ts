/**
 * Shared TypeScript types for the Gate Monitoring System.
 * Source: Plan/UI_Plan_Gate_Monitoring_System.md + Plan/Gate_Monitoring_BACKEND_Architecture.md
 */

export type Role = "operator" | "supervisor" | "admin" | "sysadmin" | "parent" | "student";

export type DepartmentCode = "CSE" | "IT" | "ECE" | "EEE" | "ME";

export type User = {
  id: string;
  employeeId?: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role: Role;
  gateId?: string;
  pin?: string;
  parentId?: string;
};

export type Department = {
  code: DepartmentCode;
  name: string;
  hod: string;
};

export type GateType = "main" | "hostel" | "back";

export type Gate = {
  id: string;
  name: string;
  location: string;
  type: GateType;
  isActive: boolean;
};

export type StudentStatus = "active" | "inactive" | "suspended" | "graduated";

export type Student = {
  id: string;
  roll: string;
  name: string;
  department: DepartmentCode;
  year: number;
  section?: string;
  batch?: string;
  photo: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  parentId?: string;
  idValidUntil?: string;
  qrCode: string;
  status?: StudentStatus;
};

export type ScanDirection = "IN" | "OUT";
export type ExitReason = "Home Out" | "Day Out" | "Leave" | "Regular";

export type Scan = {
  id: string;
  roll: string;
  name: string;
  department: DepartmentCode;
  year: number;
  direction: ScanDirection;
  reason?: ExitReason;
  gateId: string;
  gateName: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
  isManual: boolean;
  isCorrection?: boolean;
  originalScanId?: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  userId: string;
  userName: string;
  role: Role;
  timestamp: string;
  details: string;
  gateId?: string;
};

export type GatePassStatus = "PENDING" | "APPROVED_PARENT" | "APPROVED_ADMIN" | "REJECTED" | "ACTIVE" | "COMPLETED" | "EXPIRED";

export type GatePass = {
  id: string;
  roll: string;
  studentName: string;
  department: DepartmentCode;
  reason: ExitReason;
  from: string;
  to: string;
  description?: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  parentStatus: "PENDING" | "APPROVED" | "REJECTED";
  adminStatus: "PENDING" | "APPROVED" | "REJECTED";
  finalStatus: GatePassStatus;
  parentComment?: string;
  adminComment?: string;
  parentApproverId?: string;
  adminApproverId?: string;
  qrCode?: string;
};

export type AlertSeverity = "critical" | "warning" | "info";

export type Alert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  gateId?: string;
  studentRoll?: string;
  timestamp: string;
  resolved: boolean;
};

export type DashboardData = {
  onCampus: number;
  todayIn: number;
  todayOut: number;
  totalScans: number;
  activeAlerts: number;
  trendOnCampus: string;
  trendOut: string;
  trendScans: string;
  locations: Array<{ id: string; name: string; count: number; status: "active" | "alert"; type: "gate" | "location" }>;
  activityFeed: Scan[];
  deptBreakdown: Array<{ dept: string; deptCode: DepartmentCode; in: number; out: number; pct: number }>;
  alerts: Alert[];
  gatePasses: GatePass[];
};

export type AuthSession = {
  user: User | null;
  role: Role | null;
  authenticated: boolean;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
};

export type DashboardStats = {
  entries: number;
  exits: number;
  onCampus: number;
  lastScan: Scan | null;
  recentScans: Scan[];
};