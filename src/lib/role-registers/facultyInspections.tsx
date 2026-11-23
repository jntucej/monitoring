/**
 * Pure inspection model builders for Faculty registers:
 * - My Classes (/faculty/my-classes)
 * - Class Requests & Class Issues (/faculty/class-requests)
 * - Correction Requests (/faculty/correction-requests)
 * - Reports (/faculty/reports)
 *
 * (Request History & Student Directory are in separate sub-modules to keep files <400 lines)
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export {
  buildStudentDirectoryInspection,
  type StudentDirectoryRecord,
} from "./studentDirectoryInspection";

export {
  buildFacultyRequestHistoryInspection,
  type FacultyRequestHistoryRecord,
} from "./facultyRequestHistoryInspection";

function when(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

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

/* ── 1. My Classes (/faculty/my-classes) ── */

export interface FacultyClassRecord {
  id: string;
  departmentId: string;
  year: number;
  section: string;
  name: string | null;
  capacity: number | null;
  subjectCodes?: string[];
}

export function buildFacultyClassInspection(c: FacultyClassRecord): EntityInspection {
  const title = c.name || `Year ${c.year} - Section ${c.section}`;
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Class / Section", `Year ${c.year} · Section ${c.section}`],
      ["Class Name", c.name ?? "—"],
      ["Department ID", <span key="dept" className="font-mono text-xs">{c.departmentId}</span>],
      ["Student Capacity", c.capacity ?? "—"],
      ["Subject Codes", c.subjectCodes && c.subjectCodes.length > 0 ? c.subjectCodes.join(", ") : "—"],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Class section assigned to you as class teacher. Links to attendance register and student directory.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">Assigned class actions:</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/faculty/attendance/${encodeURIComponent(c.id)}`}
              className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
            >
              Take attendance →
            </a>
            <a
              href="/faculty/student-directory"
              className="inline-block text-xs font-semibold text-text-secondary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
            >
              Student roster →
            </a>
          </div>
        </div>
      ),
    },
  ];

  return {
    kind: "faculty_class",
    title,
    subtitle: `Year ${c.year} - Sec ${c.section}`,
    status: <span className="text-xs font-semibold text-action-success">ASSIGNED</span>,
    sections,
    detailHref: `/faculty/attendance/${encodeURIComponent(c.id)}`,
    detailLabel: "Open class attendance",
  };
}

/* ── 2. Class Requests & Issues (/faculty/class-requests) ── */

export interface FacultyClassRequestRecord {
  id: string;
  category_code: string;
  title: string;
  priority: string;
  status: string;
  student_name: string;
  class_name: string | null;
  created_at: string;
}

export function buildFacultyClassRequestInspection(
  r: FacultyClassRequestRecord,
  canResolve = false,
  onResolve?: () => void,
): EntityInspection {
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Title", r.title],
      ["Category", r.category_code],
      ["Priority", r.priority.toUpperCase()],
      ["Status", r.status],
      ["Student", r.student_name],
      ["Class", r.class_name ?? "—"],
      ["Submitted", when(r.created_at)],
    ]),
    {
      title: "Context & Relationships",
      content: <p className="text-xs text-text-muted">Individual student class request routed to faculty queue.</p>,
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          {canResolve && onResolve ? (
            <div className="space-y-1.5">
              <p className="text-xs text-text-muted">You are authorized to resolve this request:</p>
              <button
                type="button"
                onClick={onResolve}
                className="rounded-lg bg-action-primary text-white text-xs font-semibold px-3 py-1.5 hover:bg-action-primary/90 focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none"
              >
                Resolve request
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Inspection only — resolving this request is restricted to the assigned routed owner.
            </p>
          )}
        </div>
      ),
    },
  ];

  return {
    kind: "class_request",
    title: r.title,
    subtitle: `${r.student_name} · ${r.class_name ?? "General"}`,
    status: (
      <span className={`text-xs font-semibold ${r.priority === "urgent" ? "text-action-warning" : "text-text-muted"}`}>
        {r.status.toUpperCase()}
      </span>
    ),
    sections,
  };
}

export interface FacultyClassLevelIssueRecord {
  id: string;
  topic: string;
  status: string;
  class_name: string | null;
  request_ids: string[];
  created_at: string;
}

export function buildFacultyClassIssueInspection(
  issue: FacultyClassLevelIssueRecord,
  isHod = false,
  onResolve?: () => void,
): EntityInspection {
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Topic", issue.topic],
      ["Class", issue.class_name ?? "—"],
      ["Status", issue.status],
      ["Linked Requests", issue.request_ids?.length ?? 0],
      ["Created", when(issue.created_at)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Class-level issue aggregated from {issue.request_ids?.length ?? 0} student request(s).
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          {isHod && onResolve ? (
            <div className="space-y-1.5">
              <p className="text-xs text-text-muted">HOD/VP action available:</p>
              <button
                type="button"
                onClick={onResolve}
                className="rounded-lg bg-action-primary text-white text-xs font-semibold px-3 py-1.5 hover:bg-action-primary/90 focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none"
              >
                Resolve class issue
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              Inspection only — class-level issues require HOD or Vice Principal tier to resolve.
            </p>
          )}
        </div>
      ),
    },
  ];

  return {
    kind: "class_issue",
    title: issue.topic,
    subtitle: `${issue.class_name ?? "Class"} · ${issue.request_ids?.length ?? 0} request(s)`,
    status: <span className="text-xs font-semibold text-action-warning">{issue.status.toUpperCase()}</span>,
    sections,
  };
}

/* ── 3. Correction Requests (/faculty/correction-requests) ── */

export interface FacultyCorrectionRequestRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: { name: string; unique_id?: string } | null;
  requester?: { id: string; name: string; role: string } | null;
}

export function buildFacultyCorrectionInspection(r: FacultyCorrectionRequestRecord): EntityInspection {
  const studentName = r.student?.name ?? "—";
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span key="tkt" className="font-mono">{r.ticket_number}</span>],
      ["Student", studentName],
      ["Roll / Unique ID", r.student?.unique_id ?? "—"],
      ["Workflow", r.workflow_type],
      ["Current Stage", r.current_stage],
      ["Status", r.status],
      ["SLA Deadline", when(r.sla_deadline)],
      ["Requester", r.requester?.name ? `${r.requester.name} (${r.requester.role})` : "—"],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Attendance correction memo pending approval chain. Faculty recommend/verify; HOD approves.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — faculty review and recommend; final memo decision rests with HOD.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(r.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Open permission detail →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "correction_request",
    title: `Memo · ${r.ticket_number}`,
    subtitle: `${studentName} · Stage: ${r.current_stage}`,
    status: <span className="text-xs font-semibold text-text-muted">{r.status}</span>,
    sections,
    detailHref: `/permissions/${encodeURIComponent(r.ticket_number)}`,
    detailLabel: "Open permission detail",
  };
}

/* ── 4. Reports (/faculty/reports) ── */

export interface FacultyDeptSummaryRecord {
  department: string;
  totalFaculty: number;
  presentToday: number;
  attendanceRate: number;
}

export function buildFacultyReportDeptInspection(d: FacultyDeptSummaryRecord): EntityInspection {
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Department", d.department],
      ["Total Faculty", d.totalFaculty],
      ["Present Today", d.presentToday],
      ["Absent Today", Math.max(0, d.totalFaculty - d.presentToday)],
      ["Attendance Rate", `${d.attendanceRate}%`],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Daily attendance rollup for {d.department}. Aggregated from biometric check-ins and faculty roster.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — summary report aggregates cannot be directly edited.
          </p>
          <a
            href="/faculty/my-classes"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            View my classes →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "department_report",
    title: d.department,
    subtitle: `${d.presentToday} / ${d.totalFaculty} present`,
    status: <span className="text-xs font-semibold text-action-success">{d.attendanceRate}%</span>,
    sections,
    detailHref: "/faculty/my-classes",
    detailLabel: "View my classes",
  };
}
