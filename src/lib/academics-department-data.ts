// src/lib/academics-department-data.ts
// SCAFFOLD:ACADEMICS — types + aggregators + seed fallback.
// Regenerate with: node scripts/scaffold-academics-panel.mjs new vice-principal --force

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface AcademicHod {
  id: string;
  name: string;
  email?: string | null;
  uniqueId?: string | null;
  /** ISO timestamp of last assignment (audit trail lives in audit_logs). */
  assignedAt?: string | null;
}

export interface AcademicDepartmentRow {
  /** Stable department code (CSE / IT / ECE / EEE / MECH / …) */
  code: string;
  /** Human display name */
  name: string;
  /** Assigned HOD — null when vacant */
  hod: AcademicHod | null;
  /** Active faculty headcount (users.role IN academic set) */
  facultyCount: number;
  /** Active student headcount (users.role = 'student') */
  studentCount: number;
  /** Faculty-to-student ratio, computed = studentCount / max(facultyCount, 1) */
  ratio: number;
  /** Live presence today */
  onCampus: number;
  inToday: number;
  outToday: number;
  /** Optional heatmap by year — y1..y4 + lateral entry */
  heatmap?: { y1: number; y2: number; y3: number; y4: number; le: number };
}

export interface AcademicsDepartmentTotals {
  departments: number;
  students: number;
  faculty: number;
  /** Campus-wide ratio = totalStudents / max(totalFaculty, 1) */
  ratio: number;
  /** True when the API returned live rows (vs. the seed fallback) */
  live: boolean;
}

export interface AcademicsDepartmentPayload {
  departments: AcademicDepartmentRow[];
  totals: AcademicsDepartmentTotals;
  generatedAt: string;
}

/** Envelope the API actually returns: { data: AcademicsDepartmentPayload }. */
export interface AcademicsDepartmentEnvelope {
  data?: AcademicsDepartmentPayload;
}

/* ─── Aggregators (pure, memo-friendly) ─────────────────────────── */

export function computeRatio(studentCount: number, facultyCount: number): number {
  if (facultyCount <= 0) return studentCount > 0 ? Number.POSITIVE_INFINITY : 0;
  return Math.round((studentCount / facultyCount) * 10) / 10;
}

export function ratioLabel(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "—";
  return `1 : ${ratio}`;
}

export function summarize(rows: AcademicDepartmentRow[]): AcademicsDepartmentTotals {
  const students = rows.reduce((s, r) => s + r.studentCount, 0);
  const faculty  = rows.reduce((s, r) => s + r.facultyCount, 0);
  return {
    departments: rows.length,
    students,
    faculty,
    ratio: computeRatio(students, faculty),
    live: false,
  };
}

/* ─── Seed fallback (only used when the API returns zero rows) ──── */

export const SEED_DEPARTMENTS: AcademicDepartmentRow[] = [
  { code: "CSE",  name: "Computer Science & Engineering",   hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "IT",   name: "Information Technology",           hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "ECE",  name: "Electronics & Communication Engg", hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "EEE",  name: "Electrical & Electronics Engg",    hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
  { code: "MECH", name: "Mechanical Engineering",           hod: null, facultyCount: 0, studentCount: 0, ratio: 0, onCampus: 0, inToday: 0, outToday: 0, heatmap: { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 } },
];

/* ─── Type guards ────────────────────────────────────────────────── */

export function isAcademicsPayload(v: unknown): v is AcademicsDepartmentPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as { departments?: unknown; totals?: unknown };
  return Array.isArray(p.departments) && typeof p.totals === "object" && p.totals !== null;
}

export function isAcademicsEnvelope(v: unknown): v is AcademicsDepartmentEnvelope {
  if (!v || typeof v !== "object") return false;
  return isAcademicsPayload((v as { data?: unknown }).data);
}
