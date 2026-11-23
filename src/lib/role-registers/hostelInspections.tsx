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
