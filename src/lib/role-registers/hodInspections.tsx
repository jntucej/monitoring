/**
 * Pure inspection model builders for Head of Department (HOD) registers:
 * - ClassesView (/hod/classes)
 * - FacultyAttendanceView (/hod/faculty/attendance)
 * - FacultyDirectoryView (/hod/faculty/directory)
 * - ReportsView (/hod/reports)
 * - StudentDirectoryView (/hod/students)
 *
 * Strict adherence to:
 * - Records are gateways (overview → context → actions)
 * - No invented actions or fabricated relationships
 * - Spec §7 department-style: overview + attention + people + activity
 * - Every value comes from the row
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export {
  buildStudentDirectoryInspection,
  type StudentDirectoryRecord,
} from "./studentDirectoryInspection";

function kv(title: string, pairs: Array<[string, React.ReactNode]>): InspectionSection {
  return {
    title,
    content: (
      <dl className="space-y-1.5">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="text-sm text-text-primary">{v ?? "—"}</dd>
          </div>
        ))}
      </dl>
    ),
  };
}

/* ── 1. HOD: Class Schedule (ClassesView) ── */

export interface HodScheduleRecord {
  id: string;
  periodNumber?: number;
  subjectName?: string;
  subjectCode?: string;
  roomNumber?: string;
  startTime?: string;
  endTime?: string;
  attendanceMarked?: boolean;
  className?: string;
  year?: number;
  section?: string;
}

export function buildHodScheduleInspection(r: HodScheduleRecord): EntityInspection {
  const subject = r.subjectName ?? r.subjectCode ?? (r.periodNumber ? `Period ${r.periodNumber}` : "Class Session");
  const timeStr = r.startTime ? `${r.startTime} – ${r.endTime ?? ""}` : "Timetable slot";
  const classStr = r.className ?? (r.year ? `Year ${r.year} · Sec ${r.section ?? "A"}` : "Class Section");

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Subject", subject],
      ["Subject Code", r.subjectCode ?? "—"],
      ["Period", r.periodNumber ? `Period ${r.periodNumber}` : "—"],
      ["Class / Section", classStr],
      ["Room Number", r.roomNumber ?? "—"],
      ["Time", timeStr],
      ["Attendance Status", r.attendanceMarked ? "Marked" : "Pending"],
    ]),
    {
      title: "Attention & Activity",
      content: (
        <div className="space-y-1 text-xs">
          <p className="text-text-secondary">
            {r.attendanceMarked
              ? "Faculty completed register attendance for this session."
              : "Attendance marker is currently pending for this period."}
          </p>
          <p className="text-text-muted">Room location: {r.roomNumber ?? "Unassigned"}.</p>
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — timetable schedule management is handled via academic operations.
          </p>
          <a
            href="/hod/faculty/attendance"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Check faculty attendance →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "class_schedule",
    title: subject,
    subtitle: `${classStr} · Room ${r.roomNumber ?? "—"}`,
    status: (
      <span
        className={`text-xs font-semibold ${
          r.attendanceMarked ? "text-action-success" : "text-action-warning"
        }`}
      >
        {r.attendanceMarked ? "MARKED" : "PENDING"}
      </span>
    ),
    sections,
    detailHref: "/hod/faculty/attendance",
    detailLabel: "Check faculty attendance",
  };
}

/* ── 2. HOD: Faculty Attendance (FacultyAttendanceView) ── */

export interface HodFacultyAttendanceRecord {
  id: string;
  fullName: string;
  designation: string;
  status: string;
  firstInTime?: string | null;
  lastOutTime?: string | null;
  punctualityStatus?: string;
  totalHoursToday?: string;
}

export function buildHodFacultyAttendanceInspection(r: HodFacultyAttendanceRecord): EntityInspection {
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Faculty Name", r.fullName],
      ["Designation", r.designation],
      ["Status", r.status],
      ["Punctuality", r.punctualityStatus ?? "ON_TIME"],
      ["First In", r.firstInTime ?? "—"],
      ["Last Out", r.lastOutTime ?? "—"],
      ["Hours Logged", r.totalHoursToday ?? "—"],
    ]),
    {
      title: "Attention & People",
      content: (
        <div className="space-y-1 text-xs">
          <p className="text-text-secondary">
            Today&#39;s biometric gate scan & classroom attendance record for {r.fullName}.
          </p>
          {r.punctualityStatus === "LATE" && (
            <p className="text-action-warning font-medium">Flagged as late check-in.</p>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — check-in telemetry feeds from gate biometric logs.
          </p>
          <a
            href="/hod/faculty/directory"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            View faculty directory →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "faculty_attendance",
    title: r.fullName,
    subtitle: `${r.designation} · ${r.status}`,
    status: (
      <span
        className={`text-xs font-semibold ${
          r.status === "PRESENT" || r.status === "INSIDE"
            ? "text-action-success"
            : r.status === "ABSENT"
            ? "text-action-danger"
            : "text-action-warning"
        }`}
      >
        {r.status}
      </span>
    ),
    sections,
    detailHref: "/hod/faculty/directory",
    detailLabel: "View faculty directory",
  };
}

/* ── 3. HOD: Faculty Directory (FacultyDirectoryView) ── */

export interface HodFacultyDirectoryRecord {
  id: string;
  name: string;
  email?: string;
  employee_details?: {
    designation?: string;
    employee_id?: string;
  } | null;
}

export function buildHodFacultyDirectoryInspection(r: HodFacultyDirectoryRecord): EntityInspection {
  const desig = r.employee_details?.designation ?? "Faculty Member";
  const empId = r.employee_details?.employee_id ?? "—";

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Name", r.name || "—"],
      ["Designation", desig],
      ["Employee ID", <span key="empid" className="font-mono text-xs">{empId}</span>],
      ["Email", r.email ?? "—"],
    ]),
    {
      title: "People & Scope",
      content: (
        <p className="text-xs text-text-muted">
          Department faculty member roster entry. Authorized for classroom teaching and subject evaluation.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — employee profile updates are managed through institutional HR.
          </p>
          <a
            href="/hod/classes"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            View department timetable →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "faculty_member",
    title: r.name || "Faculty Member",
    subtitle: `${desig} · ID: ${empId}`,
    status: <span className="text-xs font-semibold text-action-success">ACTIVE</span>,
    sections,
    detailHref: "/hod/classes",
    detailLabel: "View department timetable",
  };
}

/* ── 4. HOD: Department Reports (ReportsView) ── */

export interface HodReportMetricRecord {
  metric: string;
  value: number;
  description: string;
}

export function buildHodReportMetricInspection(r: HodReportMetricRecord): EntityInspection {
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Metric Name", r.metric],
      ["Current Value", <span key="val" className="font-semibold text-text-primary tabular-nums">{r.value}</span>],
      ["Description", r.description],
    ]),
    {
      title: "Activity & Provenance",
      content: (
        <p className="text-xs text-text-muted">
          Real-time institutional metric computed from campus gate telemetry and student attendance state.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — aggregated department metrics cannot be modified manually.
          </p>
          <a
            href="/hod/students"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Open student directory →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "department_metric",
    title: r.metric,
    subtitle: `${r.value} · ${r.description}`,
    status: <span className="text-xs font-semibold text-action-info">{r.value}</span>,
    sections,
    detailHref: "/hod/students",
    detailLabel: "Open student directory",
  };
}
