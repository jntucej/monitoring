/**
 * PR-15 / Milestone inspections for Deputy Warden registers:
 * - Decision History (hostel workflow decisions)
 * - Gate Movement (presence matrix per gate)
 * - Incident Reporting (/api/alerts visible to deputy warden)
 * - Shift Handover (shift logs & handover items)
 *
 * Strict adherence to:
 * - Records are gateways (overview → context → actions)
 * - No invented actions or relationships
 * - Real API endpoints and authorized roles only
 */
import type {
  EntityInspection,
  InspectionSection,
} from "@/components/shared/EntityInspector";

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

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. Deputy Warden: Decision History
 * Past hostel-flow permission decisions at or beyond the deputy-warden stage.
 * Decisions are final/past records; inspection only (read-only).
 * ───────────────────────────────────────────────────────────────────────────── */

export interface DeputyWardenDecisionRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  decidedAt?: string | null;
}

export function buildDeputyWardenDecisionInspection(
  row: DeputyWardenDecisionRecord
): EntityInspection {
  const decided = row.decidedAt ?? row.updated_at ?? row.created_at;
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Ticket Number", <span key="ticket" className="font-mono">{row.ticket_number}</span>],
      ["Workflow Type", row.workflow_type],
      ["Status", row.status],
      ["Current Stage", row.current_stage],
      ["Decided At", when(decided)],
      ["SLA Deadline", when(row.sla_deadline)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <p className="text-xs text-text-muted">
          Past hostel workflow permission record. Historical decisions are preserved in the audit ledger.
        </p>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — past decision records cannot be altered from this register.
          </p>
          <a
            href={`/permissions/${encodeURIComponent(row.ticket_number)}`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Open permission detail →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "hostel_decision",
    title: `Decision · ${row.ticket_number}`,
    subtitle: `${row.workflow_type} · ${row.status}`,
    status: (
      <span className="text-xs font-semibold text-text-muted">
        {row.status}
      </span>
    ),
    sections,
    detailHref: `/permissions/${encodeURIComponent(row.ticket_number)}`,
    detailLabel: "View permission record",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. Deputy Warden: Gate Movement
 * Live presence matrix entry per campus entry/exit gate.
 * Inspection only (live sensor/counter data).
 * ───────────────────────────────────────────────────────────────────────────── */

export interface DeputyWardenGateMovementRecord {
  id: string;
  name: string;
  code: string;
  audience: string;
  type: string;
  onCampusCount?: number;
  roleCounts?: Record<string, number>;
}

export function buildDeputyWardenGateMovementInspection(
  row: DeputyWardenGateMovementRecord
): EntityInspection {
  const roleBreakdown = row.roleCounts
    ? Object.entries(row.roleCounts)
        .map(([r, c]) => `${r}: ${c}`)
        .join(", ")
    : null;

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Gate Name", row.name],
      ["Gate Code", <span key="code" className="font-mono">{row.code || row.id}</span>],
      ["Audience", row.audience],
      ["Gate Type", row.type],
      ["On Campus", row.onCampusCount ?? 0],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <div className="space-y-1 text-xs text-text-muted">
          <p>Feeding campus-wide presence matrix and curfew tracking.</p>
          {roleBreakdown ? (
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
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            Inspection only — gate telemetry is managed by security operations and gate operators.
          </p>
          <a
            href={`/deputy-warden/curfew-oversight`}
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            Check curfew oversight →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "gate_movement",
    title: row.name || row.code,
    subtitle: `${row.type} · ${row.audience}`,
    status: (
      <span className="text-xs font-semibold text-action-success">
        {row.onCampusCount ?? 0} on campus
      </span>
    ),
    sections,
    detailHref: `/deputy-warden/curfew-oversight`,
    detailLabel: "Curfew oversight",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. Deputy Warden: Incident Reporting
 * Active campus alerts / emergency incidents.
 * Emergency alert acknowledge is permitted for deputy_warden (PATCH /api/emergency/alerts/[id]/acknowledge).
 * Resolution is restricted to supervisor/principal/admin (not deputy_warden).
 * ───────────────────────────────────────────────────────────────────────────── */

export interface DeputyWardenIncidentRecord {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at?: string | null;
  message?: string;
  gateId?: string | null;
  studentRoll?: string | null;
}

export function buildDeputyWardenIncidentInspection(
  row: DeputyWardenIncidentRecord
): EntityInspection {
  const isPending = row.status !== "RESOLVED" && row.status !== "DISMISSED";
  const isEmergency = row.id.startsWith("sos-") || row.id.startsWith("emerg-") || row.severity === "critical";

  const sections: InspectionSection[] = [
    kv("Overview", [
      ["Title", row.title],
      ["Severity", row.severity],
      ["Status", row.status],
      ["Created At", when(row.created_at)],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <div className="space-y-1 text-xs text-text-muted">
          {row.gateId && <p>Associated Gate: <span className="font-mono text-text-secondary">{row.gateId}</span></p>}
          {row.studentRoll && <p>Associated Student Roll: <span className="font-mono text-text-secondary">{row.studentRoll}</span></p>}
          {!row.gateId && !row.studentRoll && <p>No specific gate or student roll attached to this alert.</p>}
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <div className="space-y-2">
          {isPending && isEmergency ? (
            <p className="text-xs text-text-muted">
              Emergency SOS alerts can be acknowledged by the Deputy Warden on the ground. Final resolution is handled by Principal / Supervisor.
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              Inspection only — incident escalation and discipline debarment are handled by the Chief Warden (Principal) and Hostel Manager.
            </p>
          )}
          <a
            href="/deputy-warden/daily-overview"
            className="inline-block text-xs font-semibold text-action-primary hover:underline focus-visible:ring-2 focus-visible:ring-action-primary focus:outline-none rounded"
          >
            View daily overview →
          </a>
        </div>
      ),
    },
  ];

  return {
    kind: "incident",
    title: row.title,
    subtitle: `${row.severity} · ${row.status}`,
    status: (
      <span className={`text-xs font-semibold ${row.severity === "critical" || row.severity === "high" ? "text-action-danger" : "text-action-warning"}`}>
        {row.status}
      </span>
    ),
    sections,
    detailHref: "/deputy-warden/daily-overview",
    detailLabel: "Open daily overview",
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. Deputy Warden: Shift Handover
 * Log of shift handover entries from previous shifts / operators.
 * Inspection only.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface DeputyWardenHandoverItem {
  type: string;
  title: string;
  details?: string;
  severity?: string;
}

export interface DeputyWardenHandoverRecord {
  id: string;
  toRole: string;
  items: DeputyWardenHandoverItem[];
  notes?: string | null;
  byName?: string | null;
  createdAt: string;
}

export function buildDeputyWardenHandoverInspection(
  row: DeputyWardenHandoverRecord
): EntityInspection {
  const sections: InspectionSection[] = [
    kv("Overview", [
      ["From", row.byName ? `From ${row.byName}` : "Previous shift"],
      ["Target Role", row.toRole],
      ["Recorded", when(row.createdAt)],
      ["Items Count", (row.items ?? []).length],
      ["Notes", row.notes || "None provided"],
    ]),
    {
      title: "Context & Relationships",
      content: (
        <div className="space-y-2">
          {(row.items ?? []).length > 0 ? (
            <ul className="space-y-1.5 divide-y divide-border/30">
              {row.items.map((it, idx) => (
                <li key={idx} className="pt-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-text-secondary">{it.type}</span>
                    {it.severity && (
                      <span className="text-[10px] uppercase font-semibold text-action-warning">
                        {it.severity}
                      </span>
                    )}
                  </div>
                  <p className="text-text-primary mt-0.5">{it.title}</p>
                  {it.details && <p className="text-text-muted mt-0.5">{it.details}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">No specific line items recorded in this handover.</p>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      content: (
        <p className="text-xs text-text-muted">
          Inspection only — shift handovers are historical transition logs between shift personnel.
        </p>
      ),
    },
  ];

  return {
    kind: "shift_handover",
    title: row.byName ? `Handover from ${row.byName}` : "Shift Handover",
    subtitle: `${row.toRole} · ${(row.items ?? []).length} item(s)`,
    status: (
      <span className="text-xs font-semibold text-text-muted">
        LOGGED
      </span>
    ),
    sections,
  };
}
