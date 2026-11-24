/**
 * PR-15 / Milestone inspections for OIE registers (Part 1):
 * - Access Exceptions (/api/exam/access-exceptions)
 * - Candidate Attendance (/api/exam/candidate-attendance)
 * - Decision History (/api/permissions?workflow_type=exam)
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";
import { when, kv } from "./oieHelpers";

export * from "./oieHelpers";
export * from "./oieInspectionsCoordination";

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. OIE: Access Exceptions
 * Exceptions surfaced for OIE review only.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface OieAccessExceptionRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  updated_at?: string;
  candidate_name?: string | null;
  candidate_unique_id?: string | null;
  roll?: string | null;
}

export function buildOieAccessExceptionInspection(
  row: OieAccessExceptionRecord
): EntityInspection {
  const candidate = row.candidate_name || row.roll || "Candidate";
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span key="ticket" className="font-mono">{row.ticket_number}</span>],
      ["Candidate Name", row.candidate_name || "—"],
      ["Roll Number", row.roll || row.candidate_unique_id || "—"],
      ["Current Stage", row.current_stage],
      ["Status", row.status],
      ["SLA Deadline", when(row.sla_deadline)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Exam-day access exception flagged during entry/verification. Linked to ticket #{row.ticket_number}.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — resolution is handled by the relevant Exam Branch or HOD office.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(row.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Open permission record →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "exam_access_exception",
    title: `Exception · ${candidate}`,
    subtitle: `${row.ticket_number} · ${row.status}`,
    status: (
      <span className="text-xs font-semibold text-action-warning">
        {row.status}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(row.ticket_number)}`,
    detailLabel: "View permission record",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. OIE: Candidate Attendance
 * Gate scan records logged for candidate entry/exit during exam sessions.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface OieCandidateAttendanceRecord {
  id: string;
  person_id: string;
  date: string;
  time_in?: string | null;
  time_out?: string | null;
  status: string;
  direction: string;
  timestamp_utc: string;
  candidate_name?: string | null;
  candidate_unique_id?: string | null;
  roll?: string | null;
}

export function buildOieCandidateAttendanceInspection(
  row: OieCandidateAttendanceRecord
): EntityInspection {
  const candidate = row.candidate_name || row.roll || row.candidate_unique_id || "Candidate";
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Candidate", candidate],
      ["Roll Number", row.roll || "—"],
      ["Unique ID", row.candidate_unique_id || "—"],
      ["Direction", row.direction],
      ["Date", row.date],
      ["Timestamp", when(row.timestamp_utc)],
      ["Status", row.status],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Gate scan record captured at exam perimeter for session verification.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — gate telemetry is verified against hall attendance lists.
          </p>
          <a
            href="/oie/examination-day-access"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Check exam-day access exceptions →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "candidate_attendance",
    title: `Attendance · ${candidate}`,
    subtitle: `${row.direction} · ${row.status}`,
    status: (
      <span className={`text-xs font-semibold ${row.direction === "IN" ? "text-action-success" : "text-action-warning"}`}>
        {row.direction} · {row.status}
      </span>
    ),
    sections,
    detailHref: "/oie/examination-day-access",
    detailLabel: "Exam-day access",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. OIE: Decision History
 * Completed or past exam approvals (COMPLETED, APPROVED, REJECTED, ESCALATED).
 * ───────────────────────────────────────────────────────────────────────────── */

export interface OieHistoryRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  updated_at?: string;
  stage_history?: Array<Record<string, unknown>> | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function buildOieDecisionHistoryInspection(
  row: OieHistoryRecord
): EntityInspection {
  const studentName = row.student?.name || "Student";
  const roll = row.student?.student_details?.roll;
  const stageCount = Array.isArray(row.stage_history) ? row.stage_history.length : 0;

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span key="ticket" className="font-mono">{row.ticket_number}</span>],
      ["Student", studentName],
      ["Roll Number", roll || "—"],
      ["Status", row.status],
      ["Last Updated", when(row.updated_at ?? row.created_at)],
      ["Stages Traversed", `${stageCount} stage(s)`],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Archived exam-flow permission request with {stageCount} recorded transition(s).
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — past exam workflow decisions cannot be edited.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(row.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Open full ticket audit trail →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "exam_decision",
    title: `Decision · ${row.ticket_number}`,
    subtitle: `${studentName} · ${row.status}`,
    status: (
      <span className="text-xs font-semibold text-text-muted">
        {row.status}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(row.ticket_number)}`,
    detailLabel: "Open permission ticket",
  };
}
