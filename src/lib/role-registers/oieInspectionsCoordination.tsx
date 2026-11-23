/**
 * PR-15 / Milestone inspections for OIE registers (Part 2):
 * - Exam Branch Coordination (/api/permissions?workflow_type=exam&stage=exam_branch)
 * - Examination Day Access (/api/permissions?workflow_type=exam&stage=oie)
 * - Records (/api/permissions?workflow_type=exam&stage=oie&status=PENDING)
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";
import { when, kv } from "./oieHelpers";

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. OIE: Exam Branch Coordination
 * Items pending at the exam_branch stage.
 * OIE inspects coordination status; sign-off belongs to exam_branch.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface OieCoordinationRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function buildOieCoordinationInspection(
  row: OieCoordinationRecord
): EntityInspection {
  const studentName = row.student?.name || "Student";
  const roll = row.student?.student_details?.roll;

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span className="font-mono">{row.ticket_number}</span>],
      ["Student", studentName],
      ["Roll Number", roll || "—"],
      ["Current Stage", row.current_stage],
      ["Status", row.status],
      ["SLA Deadline", when(row.sla_deadline)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Active item currently pending exam-branch sign-off and schedule verification.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — awaiting sign-off and clearance by the Exam Branch team.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(row.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Review coordination ticket →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "exam_coordination",
    title: `Coordination · ${row.ticket_number}`,
    subtitle: `${studentName} · Stage: ${row.current_stage}`,
    status: (
      <span className="text-xs font-semibold text-unit-c">
        {row.status}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(row.ticket_number)}`,
    detailLabel: "Open permission ticket",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 5. OIE: Examination-Day Access
 * Exam-day access requests currently monitored by the OIE desk.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface OieExaminationDayAccessRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function buildOieExaminationDayAccessInspection(
  row: OieExaminationDayAccessRecord
): EntityInspection {
  const studentName = row.student?.name || "Student";
  const roll = row.student?.student_details?.roll;

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span className="font-mono">{row.ticket_number}</span>],
      ["Student", studentName],
      ["Roll Number", roll || "—"],
      ["Current Stage", row.current_stage],
      ["Status", row.status],
      ["SLA Deadline", when(row.sla_deadline)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Exam-day perimeter access record for scheduled exam candidate.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — gate access validation occurs in real time via operator scan stations.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(row.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            View ticket status →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "exam_day_access",
    title: `Day Access · ${studentName}`,
    subtitle: `${row.ticket_number} · ${row.status}`,
    status: (
      <span className="text-xs font-semibold text-action-info">
        {row.status}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(row.ticket_number)}`,
    detailLabel: "Open ticket",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 6. OIE: Records (Assigned Operational Records / OIE stage queue)
 * Actionable items currently at the OIE examination stage.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface OieRecordRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function buildOieRecordInspection(
  row: OieRecordRow
): EntityInspection {
  const studentName = row.student?.name || "Student";
  const roll = row.student?.student_details?.roll;

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span className="font-mono">{row.ticket_number}</span>],
      ["Student", studentName],
      ["Roll Number", roll || "—"],
      ["Workflow", row.workflow_type],
      ["Current Stage", row.current_stage],
      ["Status", row.status],
      ["SLA Deadline", when(row.sla_deadline)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Assigned operational record at OIE examination review stage.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Actionable at OIE review stage. Open approvals desk or review ticket to decide.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(row.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Review &amp; decide ticket →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "oie_operational_record",
    title: `Record · ${row.ticket_number}`,
    subtitle: `${studentName} · ${row.status}`,
    status: (
      <span className="text-xs font-semibold text-action-warning">
        {row.status}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(row.ticket_number)}`,
    detailLabel: "Review ticket",
  };
}
