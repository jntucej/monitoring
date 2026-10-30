"use client";

/* ── shared response types ── */

export interface StaffAttendanceResp {
  summary?: {
    totalStaff: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    warningCount: number;
    overallAttendanceRate: number;
  };
  records?: Array<{
    id: string;
    fullName: string;
    designation: string;
    status: string;
    firstInTime?: string | null;
  }>;
}

export interface AuditRecord {
  id: string;
  action: string;
  user_name?: string;
  user_role?: string;
  userId?: string;
  details?: Record<string, unknown> | string | null;
  timestamp: string;
}

export interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  staffCount?: number;
}

export interface OutpassRow {
  id: string;
  ticket_number: string;
  status: string;
  workflow_type: string;
  current_stage?: string;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
  requested_at?: string;
  updated_at?: string;
  created_at?: string;
  expiry?: string | null;
}

export interface PresenceMatrixData {
  gates?: Array<{ id: string; name?: string; code?: string }>;
  roles?: string[];
  matrix?: Record<string, Record<string, number>>;
  lastUpdated?: string;
}

export interface HostelRow {
  hostel: string;
  count: number;
  capacity: number;
}

export const HOSTEL_CODES = ["CSE", "IT", "ECE", "EEE", "ME"] as const;
export const HOSTEL_CAPACITIES: Record<string, number> = {
  CSE: 500,
  IT: 450,
  ECE: 400,
  EEE: 350,
  ME: 400,
};

export function hostelRowFor(code: string, count: number): HostelRow {
  return { hostel: code, count, capacity: HOSTEL_CAPACITIES[code] ?? 0 };
}

/* ── formatters ── */

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

/** Render an audit `details` field (JSONB object, string, or null) compactly. */
export function fmtDetails(details: AuditRecord["details"]): string {
  if (!details) return "";
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === "object") return JSON.stringify(parsed);
      return String(parsed ?? details);
    } catch {
      return details;
    }
  }
  const summary = Object.values(details);
  if (summary.length === 0) return "";
  return JSON.stringify(details).slice(0, 120);
}
