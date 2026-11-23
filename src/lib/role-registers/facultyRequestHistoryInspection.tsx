import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export interface FacultyRequestHistoryRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: { name: string; unique_id?: string } | null;
}

export function buildFacultyRequestHistoryInspection(r: FacultyRequestHistoryRecord): EntityInspection {
  const studentName = r.student?.name ?? "—";
  const sections: InspectionSection[] = [
    {
      title: "Overview",
      content: (
        <dl className="space-y-1.5">
          <div><dt className="text-xs text-text-muted">Ticket Number</dt><dd className="text-sm text-text-primary font-mono">{r.ticket_number}</dd></div>
          <div><dt className="text-xs text-text-muted">Student</dt><dd className="text-sm text-text-primary">{studentName}</dd></div>
          <div><dt className="text-xs text-text-muted">Roll / Unique ID</dt><dd className="text-sm text-text-primary">{r.student?.unique_id ?? "—"}</dd></div>
          <div><dt className="text-xs text-text-muted">Workflow Type</dt><dd className="text-sm text-text-primary">{r.workflow_type}</dd></div>
          <div><dt className="text-xs text-text-muted">Current Stage</dt><dd className="text-sm text-text-primary">{r.current_stage}</dd></div>
          <div><dt className="text-xs text-text-muted">Status</dt><dd className="text-sm text-text-primary">{r.status}</dd></div>
          <div><dt className="text-xs text-text-muted">SLA Deadline</dt><dd className="text-sm text-text-primary">{r.sla_deadline ? new Date(r.sla_deadline).toLocaleDateString([], { dateStyle: "medium" }) : "—"}</dd></div>
        </dl>
      ),
    },
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Historical exam permission request raised at or passed through faculty stage.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — historical request records cannot be modified from this register.
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
    kind: "request_history",
    title: `Exam Request · ${r.ticket_number}`,
    subtitle: `${studentName} · ${r.status}`,
    status: <span className="text-xs font-semibold text-text-muted">{r.status}</span>,
    sections,
    detailHref: `/permissions/${encodeURIComponent(r.ticket_number)}`,
    detailLabel: "Open permission detail",
  };
}
