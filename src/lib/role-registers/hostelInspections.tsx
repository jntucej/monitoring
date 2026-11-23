/**
 * Pure inspection model builders for Hostel role registers:
 * - Hostel Occupancy Gate Row (/hostel/permissions)
 *
 * Strict adherence to:
 * - Records are gateways (overview → context → actions)
 * - No invented actions or fabricated relationships
 * - Every value comes from the row
 * - Inspection only note when role cannot act
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

export interface HostelGateOccupancyRecord {
  id: string;
  name: string;
  code: string;
  audience: string;
  type: string;
  totalOnCampus: number;
  roleCounts?: Record<string, number>;
}

export function buildHostelGateOccupancyInspection(
  g: HostelGateOccupancyRecord,
): EntityInspection {
  const roleBreakdown = g.roleCounts
    ? Object.entries(g.roleCounts)
        .map(([r, c]) => `${r}: ${c}`)
        .join(", ")
    : "—";

  const sections: InspectionSection[] = [
    {
      title: "Overview",
      content: (
        <dl className="space-y-1.5">
          <div><dt className="text-xs text-text-muted">Gate Name</dt><dd className="text-sm text-text-primary">{g.name}</dd></div>
          <div><dt className="text-xs text-text-muted">Gate Code</dt><dd className="text-sm text-text-primary font-mono">{g.code || g.id}</dd></div>
          <div><dt className="text-xs text-text-muted">Audience</dt><dd className="text-sm text-text-primary capitalize">{g.audience}</dd></div>
          <div><dt className="text-xs text-text-muted">Type</dt><dd className="text-sm text-text-primary capitalize">{g.type}</dd></div>
          <div><dt className="text-xs text-text-muted">Total On Campus</dt><dd className="text-sm text-text-primary font-semibold tabular-nums">{g.totalOnCampus}</dd></div>
        </dl>
      ),
    },
    {
      title: "Context & Relationships",
      content: (
        <div className="space-y-1 text-xs text-text-muted">
          <p>Live occupancy presence matrix for hostel residents and campus attendees.</p>
          {roleBreakdown !== "—" ? (
            <p className="text-text-secondary">Role Breakdown: {roleBreakdown}</p>
          ) : (
            <p>No role breakdown available for this gate snapshot.</p>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <p className="text-xs text-text-muted">
          Inspection only — gate telemetry is managed by security operations and gate operators.
        </p>
      ),
    },
  ];

  return {
    kind: "gate_occupancy",
    title: g.name,
    subtitle: `${g.code} · ${g.totalOnCampus} on campus`,
    status: (
      <span className="text-xs font-semibold text-action-success">
        {g.totalOnCampus} PRESENT
      </span>
    ),
    sections,
  };
}

export interface HostelPermissionRecord {
  id: string;
  ticket_number: string;
  workflow_type?: string;
  current_stage?: string;
  status?: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string; hostel_block?: string } | null;
  } | null;
}

export function buildHostelPermissionInspection(
  r: HostelPermissionRecord,
): EntityInspection {
  const studentName = r.student?.name ?? "—";
  const roll = r.student?.student_details?.roll ?? "—";
  const hostelBlock = r.student?.student_details?.hostel_block ?? "—";
  const slaFormatted = r.sla_deadline
    ? new Date(r.sla_deadline).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const sections: InspectionSection[] = [
    {
      title: "Overview",
      content: (
        <dl className="space-y-1.5">
          <div><dt className="text-xs text-text-muted">Ticket Number</dt><dd className="text-sm text-text-primary font-mono">{r.ticket_number}</dd></div>
          <div><dt className="text-xs text-text-muted">Student</dt><dd className="text-sm text-text-primary">{studentName}</dd></div>
          <div><dt className="text-xs text-text-muted">Roll Number</dt><dd className="text-sm text-text-primary font-mono">{roll}</dd></div>
          <div><dt className="text-xs text-text-muted">Hostel Block</dt><dd className="text-sm text-text-primary">{hostelBlock}</dd></div>
          <div><dt className="text-xs text-text-muted">Workflow</dt><dd className="text-sm text-text-primary">{r.workflow_type ?? "hostel"}</dd></div>
          <div><dt className="text-xs text-text-muted">Stage</dt><dd className="text-sm text-text-primary">{r.current_stage ?? "—"}</dd></div>
          <div><dt className="text-xs text-text-muted">Status</dt><dd className="text-sm text-text-primary">{r.status ?? "PENDING"}</dd></div>
          <div><dt className="text-xs text-text-muted">SLA Deadline</dt><dd className="text-sm text-text-primary">{slaFormatted}</dd></div>
        </dl>
      ),
    },
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Hostel outpass permission request. Hostel block {hostelBlock !== "—" ? hostelBlock : "unassigned"}. Pending workflow queue item.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — hostel permissions are decided by hostel-manager/principal tiers.
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
    kind: "hostel_permission",
    title: `Pass · ${r.ticket_number}`,
    subtitle: `${studentName} · Stage: ${r.current_stage ?? "—"}`,
    status: (
      <span className="text-xs font-semibold text-text-muted">
        {r.status ?? "PENDING"}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(r.ticket_number)}`,
    detailLabel: "Open permission detail",
  };
}
