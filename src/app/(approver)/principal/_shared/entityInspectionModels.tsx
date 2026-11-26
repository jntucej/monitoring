// Shared entity-inspection models for the Principal register views.
//
// Design rule (docs/design/entity-inspection-system.md): every meaningful
// record shown on a Principal page opens the Unified Entity Inspector with a
// predictable hierarchy — overview → context → history/timeline → actions.
// Each model here satisfies the shape pinned by
// tests/unit/entity-inspection.test.ts (first section is the overview layer;
// history/timeline sections are collapsible; an Actions section or a
// detailHref is always exposed).
//
// Role-appropriate depth (the /principal/cases pattern): the Actions section
// is built from the viewer's role context. The Principal (warden) sees the
// act verbs that a real API route supports; every other viewer gets a
// read-only note plus navigation links only. No capability that has no
// backing route is ever rendered as a button.

import Link from "next/link";
import type { EntityInspection } from "@/components/shared/EntityInspector";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { SmartTextRef } from "@/components/nav/SmartTextRef";

export type PrincipalRegisterKind =
  | "department"
  | "hostel"
  | "gate"
  | "incident"
  | "audit_event"
  | "delegation"
  | "exam_case"
  | "report"
  | "approval"
  | "person"
  | "person_exception"
  | "sla_cell";

export interface RoleGate {
  /** The top tier of the institution (Principal / Chief Warden = the warden). */
  isPrincipal: boolean;
  /** Faculty-level roles that can act within their own scope. */
  isFaculty: boolean;
  /** The viewer's role label, for the read-only note. */
  role: string | null;
}

/* ------------------------------------------------------------------ */
/*  Small status-badge helpers (plain strings keep the models testable) */
/* ------------------------------------------------------------------ */

function badge(value: string, tone: "ok" | "warn" | "danger" | "neutral"): React.ReactNode {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-emerald-600",
    warn: "bg-amber-500/10 text-amber-600",
    danger: "bg-rose-500/10 text-rose-600",
    neutral: "bg-bg-elevated text-text-muted",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${cls[tone]}`}>
      {value}
    </span>
  );
}

/** The read-only Actions note shown to viewers who cannot act on the entity. */
function readOnlyNote(gate: RoleGate, requirement: string) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-text-muted">
        Read-only view — {requirement}
      </p>
      {gate.role && gate.role !== "principal" ? (
        <p className="text-[11px] text-text-muted">
          Acting requires {requirement.replace(/^acting on /i, "")}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  person                                                            */
/* ------------------------------------------------------------------ */

export interface PersonRecord {
  id: string;
  uniqueId?: string;
  fullName?: string;
  name?: string;
  personType?: string;
  role?: string;
  department?: string;
  designation?: string;
  email?: string;
  status?: string;
  roll?: string;
  hostelBlock?: string;
  campusPresence?: string;
  createdAt?: string;
  student_details?: { roll?: string; year?: number; hostel_block?: string } | null;
  employee_details?: { employee_id?: string; designation?: string } | null;
}

export function buildPersonInspection(
  person: PersonRecord,
  role: RoleGate
): EntityInspection {
  const displayName = person.fullName || person.name || person.uniqueId || "Unknown";
  const roll = person.roll || person.student_details?.roll || null;
  return {
    kind: "person",
    title: displayName,
    subtitle: roll ? `${roll} · ${person.uniqueId}` : person.uniqueId || person.id,
    status: badge(person.status ?? "ACTIVE", person.status === "ACTIVE" ? "ok" : "neutral"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Type / role</dt>
              <dd className="mt-0.5 text-text-primary">{person.role ?? person.personType ?? "—"}</dd>
            </div>
            {roll ? (
              <div>
                <dt className="text-text-muted">Roll</dt>
                <dd className="mt-0.5 font-mono text-text-primary">{roll}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-muted">Department</dt>
              <dd className="mt-0.5 text-text-primary">{person.department ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd className="mt-0.5 text-text-primary">{person.status ?? "ACTIVE"}</dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Designation</dt>
              <dd className="mt-0.5 text-text-primary">
                {person.designation ?? person.employee_details?.designation ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Hostel</dt>
              <dd className="mt-0.5 text-text-primary">
                {person.hostelBlock ?? person.student_details?.hostel_block ?? "Day scholar / none"}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: role.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/approvals"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Open approvals
            </a>
            <a
              href="/principal/attention"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Attention queue
            </a>
          </div>
        ) : (
          readOnlyNote(role, "person detail management is available to the admin and principal roles")
        ),
      },
    ],
    detailHref: `/principal/people?person=${encodeURIComponent(person.id)}`,
    detailLabel: "View in people register",
  };
}

/* ------------------------------------------------------------------ */
/*  department                                                        */
/* ------------------------------------------------------------------ */

export interface DepartmentRecord {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}

export function buildDepartmentInspection(
  dept: DepartmentRecord,
  gate: RoleGate
): EntityInspection {
  return {
    kind: "department",
    title: dept.name,
    subtitle: dept.code,
    status: badge(
      `${dept.attendancePct}% present`,
      dept.attendancePct >= 75 ? "ok" : "warn"
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            {(
              [
                { label: "Headcount (students)", value: String(dept.students) },
                { label: "Faculty", value: String(dept.faculty) },
                { label: "Ratio", value: `1:${dept.ratio}` },
                { label: "Attendance today", value: `${dept.attendancePct}%` },
              ] as Array<{ label: string; value: React.ReactNode }>
            ).map((it) => (
              <div key={it.label}>
                <dt className="text-text-muted">{it.label}</dt>
                <dd className="mt-0.5 text-text-primary">{it.value}</dd>
              </div>
            ))}
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                HOD {dept.hodName ?? "(unassigned)"} · Principal oversight
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                {dept.faculty} faculty and {dept.students} students in{" "}
                {dept.name}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: gate.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/principal/people/departments"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Open department register
            </Link>
            <a
              href="/principal/people/attendance"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Absent / late lists
            </a>
          </div>
        ) : (
          readOnlyNote(
            gate,
            "department management is available to the HOD and Principal roles"
          )
        ),
      },
    ],
    detailHref: "/principal/people/departments",
    detailLabel: "View department register",
  };
}

/* ------------------------------------------------------------------ */
/*  hostel                                                            */
/* ------------------------------------------------------------------ */

export interface HostelRecord {
  /** The block code or block name (e.g. "A", "Boys 2"). */
  block: string;
  /** Total allocated / room count. */
  total: number;
  /** Currently occupied. */
  occupied: number;
  /** True when the record is the register-level aggregate (all blocks). */
  aggregate?: boolean;
}

export function buildHostelInspection(
  hostel: HostelRecord,
  gate: RoleGate
): EntityInspection {
  const occupancy =
    hostel.total > 0
      ? `${Math.round((hostel.occupied / hostel.total) * 100)}%`
      : "—";
  const displayName = hostel.aggregate ? "All hostel blocks" : `Block ${hostel.block}`;
  return {
    kind: "hostel",
    title: displayName,
    subtitle: hostel.aggregate ? "register aggregate" : hostel.block,
    status: badge(
      hostel.total > 0 && hostel.occupied >= hostel.total ? "FULL" : "ACTIVE",
      hostel.total > 0 && hostel.occupied >= hostel.total ? "warn" : "ok"
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Capacity / allocated</dt>
              <dd className="mt-0.5 text-text-primary">{hostel.total}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Occupied</dt>
              <dd className="mt-0.5 text-text-primary">{hostel.occupied}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Occupancy</dt>
              <dd className="mt-0.5 text-text-primary">{occupancy}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Scope</dt>
              <dd className="mt-0.5 text-text-primary">
                {hostel.aggregate ? "All hostel blocks" : "Single block"}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                Hostel manager · Deputy Warden · Principal
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                {hostel.aggregate
                  ? "All blocks in the hostel register"
                  : `Residents of ${hostel.block} and their leave requests`}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: gate.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/operations/hostel"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Open hostel oversight
            </a>
            <a
              href="/principal/attention"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Attention items
            </a>
          </div>
        ) : (
          readOnlyNote(
            gate,
            "hostel actions are available to the hostel manager, deputy warden and principal roles"
          )
        ),
      },
    ],
    detailHref: "/principal/operations/hostel",
    detailLabel: "View hostel oversight",
  };
}

/* ------------------------------------------------------------------ */
/*  gate                                                              */
/* ------------------------------------------------------------------ */

export interface GateRecord {
  id: string;
  name: string;
  code?: string;
  status?: string;
  location?: string;
}

export function buildGateInspection(
  gate: GateRecord,
  role: RoleGate
): EntityInspection {
  const active = gate.status === "ACTIVE" || !gate.status;
  return {
    kind: "gate",
    title: gate.name,
    subtitle: gate.code ?? gate.id,
    status: badge(active ? "OPERATIONAL" : "INACTIVE", active ? "ok" : "warn"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Location</dt>
              <dd className="mt-0.5 text-text-primary">
                {gate.location ?? "Main Campus"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd className="mt-0.5 text-text-primary">{gate.status ?? "ACTIVE"}</dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                Gate operator · Supervisor · Principal oversight
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                Gate devices, live scan stream and pass verification at{" "}
                {gate.name}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: role.isPrincipal ? (
          <div className="space-y-2">
            <p className="text-[11px] text-text-muted">
              Read-only oversight. Gate configuration and telemetry are managed
              by the admin and sysadmin roles; no act route is exposed for the
              principal role.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/principal/operations/gates"
                className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
              >
                Gate register
              </Link>
              <a
                href="/principal/operations/incidents"
                className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
              >
                Incidents
              </a>
            </div>
          </div>
        ) : (
          readOnlyNote(
            role,
            "gate management requires the admin or sysadmin role"
          )
        ),
      },
    ],
    detailHref: "/principal/operations/gates",
    detailLabel: "View gate register",
  };
}

/* ------------------------------------------------------------------ */
/*  incident (alert)                                                  */
/* ------------------------------------------------------------------ */

export interface IncidentRecord {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  created_at?: string;
  status?: string;
}

export function buildIncidentInspection(
  incident: IncidentRecord,
  role: RoleGate
): EntityInspection {
  const sev = incident.severity ?? "alert";
  const isCritical = sev === "high" || sev === "critical";
  return {
    kind: "incident",
    title: incident.title ?? incident.message ?? "Alert",
    subtitle: incident.message && incident.title ? incident.message : incident.id,
    status: badge(sev.toUpperCase(), isCritical ? "danger" : "warn"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Severity</dt>
              <dd className="mt-0.5 text-text-primary">{sev}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd className="mt-0.5 text-text-primary">{incident.status ?? "OPEN"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Raised</dt>
              <dd className="mt-0.5 text-text-primary">
                {incident.created_at
                  ? new Date(incident.created_at).toLocaleString("en-IN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Event</dt>
              <dd className="mt-0.5 font-mono text-text-primary">{incident.id}</dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                Supervisor on watch · Principal escalation
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                Linked gate, device or security event behind this alert
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Timeline",
        collapsible: true,
        content: (
          <ol className="relative border-l border-border ml-1.5 space-y-3">
            <li className="ml-4">
              <span className="absolute -left-[5px] size-2.5 rounded-full bg-rose-500 ring-2 ring-bg-surface" />
              <p className="text-xs font-medium text-text-primary">
                Alert raised
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {incident.created_at
                  ? new Date(incident.created_at).toLocaleString("en-IN")
                  : "unknown time"}
              </p>
            </li>
            <li className="ml-4">
              <span className="absolute -left-[5px] size-2.5 rounded-full bg-bg-elevated ring-2 ring-bg-surface" />
              <p className="text-xs font-medium text-text-primary">
                {incident.status ?? "OPEN"}
              </p>
            </li>
          </ol>
        ),
      },
      {
        title: "Actions",
        content: <IncidentActions incident={incident} role={role} />,
      },
    ],
  };
}

/**
 * Incident Actions section: the principal (warden) can resolve an open alert
 * in place (PATCH /api/alerts/[id] — the route's role allow-list already
 * includes "principal"), plus links to the attention / escalation registers.
 * Everyone else gets the read-only note.
 */
function IncidentActions({ incident, role }: { incident: IncidentRecord; role: RoleGate }) {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [resolving, setResolving] = useState(false);

  const open = incident.status ?? "OPEN";
  const isResolved = open === "RESOLVED" || open === "CLOSED";

  const resolve = async () => {
    if (!user?.id || isResolved) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(incident.id)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success) {
        addToast({
          message: `Alert ${incident.id} resolved`,
          variant: "success",
        });
      } else {
        addToast({
          message: json.error?.message ?? "Failed to resolve alert",
          variant: "error",
        });
      }
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to resolve alert",
        variant: "error",
      });
    } finally {
      setResolving(false);
    }
  };

  if (!role.isPrincipal) {
    return readOnlyNote(
      role,
      "resolving alerts is available to the admin, sysadmin, supervisor and principal roles"
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={resolve}
        disabled={resolving || isResolved}
        className={
          "action-btn inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition " +
          (isResolved
            ? "bg-bg-elevated text-text-muted cursor-default"
            : "bg-action-primary text-white hover:opacity-90 disabled:opacity-50")
        }
      >
        {resolving ? "Resolving…" : isResolved ? "Resolved" : "Resolve alert"}
      </button>
      <a
        href="/principal/attention"
        className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
      >
        Attention queue
      </a>
      <a
        href="/principal/escalations"
        className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
      >
        Escalations
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  audit_event                                                       */
/* ------------------------------------------------------------------ */

export interface AuditEventRecord {
  id: string;
  action: string;
  user_name?: string | null;
  user_role?: string | null;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

export function buildAuditEventInspection(
  event: AuditEventRecord,
  role: RoleGate
): EntityInspection {
  return {
    kind: "audit_event",
    title: event.action,
    subtitle: `${event.user_name ?? "System"} (${event.user_role ?? "sys"})`,
    status: badge("RECORDED", "neutral"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Actor</dt>
              <dd className="mt-0.5 text-text-primary">
                {event.user_name ?? "System"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Role</dt>
              <dd className="mt-0.5 text-text-primary">{event.user_role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Timestamp</dt>
              <dd className="mt-0.5 text-text-primary">
                {new Date(event.timestamp).toLocaleString("en-IN")}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Event</dt>
              <dd className="mt-0.5 font-mono text-text-primary">{event.id}</dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Integrity</dt>
              <dd className="mt-0.5 text-text-primary">
                Append-only audit log; the event itself cannot be edited or
                deleted.
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                The decision, override, delegation or approval event this row
                records
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Details",
        collapsible: true,
        content: event.details && Object.keys(event.details).length > 0 ? (
          <pre className="text-[11px] font-mono text-text-muted whitespace-pre-wrap break-all">
            {JSON.stringify(event.details, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-text-muted">No payload recorded.</p>
        ),
      },
      {
        title: "Actions",
        content: role.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/governance/audit"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Open audit trail
            </a>
            <a
              href="/principal/decisions"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Decision ledger
            </a>
          </div>
        ) : (
          readOnlyNote(
            role,
            "audit events are read-only records — there is no act route for this entity"
          )
        ),
      },
    ],
    detailHref: "/principal/audit",
    detailLabel: "View full audit trail",
  };
}

/* ------------------------------------------------------------------ */
/*  delegation                                                        */
/* ------------------------------------------------------------------ */

export interface DelegationRecord {
  id: string;
  delegate_role?: string;
  scope?: string;
  starts_at?: string;
  expires_at?: string | null;
  status?: string;
  note?: string | null;
}

export function buildDelegationInspection(
  delegation: DelegationRecord,
  role: RoleGate
): EntityInspection {
  const label = delegation.delegate_role?.replace(/_/g, " ") ?? "—";
  return {
    kind: "delegation",
    title: `Delegation → ${label}`,
    subtitle: delegation.scope ?? "Full workflows",
    status: badge(delegation.status ?? "ACTIVE", "ok"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Delegate role</dt>
              <dd className="mt-0.5 text-text-primary">{label}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Scope</dt>
              <dd className="mt-0.5 text-text-primary">
                {delegation.scope ?? "All workflows"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Starts</dt>
              <dd className="mt-0.5 text-text-primary">
                {delegation.starts_at
                  ? new Date(delegation.starts_at).toLocaleDateString("en-IN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Expires</dt>
              <dd className="mt-0.5 text-text-primary">
                {delegation.expires_at
                  ? new Date(delegation.expires_at).toLocaleDateString("en-IN")
                  : "Indefinite"}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <div className="space-y-2 text-xs">
            <p>
              <span className="text-text-muted">Responsible authority: </span>
              <span className="text-text-primary">
                Delegating principal; the delegated role acts within the scope
                above.
              </span>
            </p>
            {delegation.note ? (
              <p className="text-text-secondary">{delegation.note}</p>
            ) : null}
          </div>
        ),
      },
      {
        title: "Actions",
        content: role.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/governance/delegations"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Manage delegations
            </a>
            <a
              href="/principal/governance"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Governance
            </a>
          </div>
        ) : (
          readOnlyNote(
            role,
            "creating or revoking delegations is available to the principal, admin and sysadmin roles"
          )
        ),
      },
    ],
    detailHref: "/principal/governance/delegations",
    detailLabel: "View delegation manager",
  };
}

/* ------------------------------------------------------------------ */
/*  exam_case                                                         */
/* ------------------------------------------------------------------ */

export interface ExamCaseRecord {
  id?: string;
  ticket_number?: string;
  student_name?: string;
  student?: { name?: string };
  reason?: string;
  status?: string;
  created_at?: string;
}

export function buildExamCaseInspection(
  exam: ExamCaseRecord,
  role: RoleGate
): EntityInspection {
  const name = exam.student_name ?? exam.student?.name ?? "Candidate";
  const pending = exam.status === "PENDING" || !exam.status;
  return {
    kind: "exam_case",
    title: `${name} — exam clearance`,
    subtitle: exam.ticket_number ?? "—",
    status: badge(exam.status ?? "PENDING", pending ? "warn" : "neutral"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Candidate</dt>
              <dd className="mt-0.5 text-text-primary">{name}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Ticket</dt>
              <dd className="mt-0.5 font-mono text-text-primary">
                {exam.ticket_number ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Reason</dt>
              <dd className="mt-0.5 text-text-primary font-mono">
                <SmartTextRef text={exam.reason ?? "Exam hall clearance"} currentPath="/principal" />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Raised</dt>
              <dd className="mt-0.5 text-text-primary">
                {exam.created_at
                  ? new Date(exam.created_at).toLocaleString("en-IN")
                  : "—"}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                OIE / Exam Branch · Exam Superintendent oversight
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                The exam permission request and the student&rsquo;s exam
                eligibility record
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: <ExamCaseActions exam={exam} role={role} />,
      },
    ],
    detailHref: "/principal/examinations",
    detailLabel: "View examination oversight",
  };
}

/**
 * Exam case Actions section: the principal (warden) can mark an exam access
 * exception resolved in place (PATCH /api/exam/access-exceptions — the
 * route's role allow-list includes "principal"), plus the decision ledger.
 * Everyone else gets the read-only note.
 */
function ExamCaseActions({ exam, role }: { exam: ExamCaseRecord; role: RoleGate }) {
  const addToast = useUIStore((s) => s.addToast);
  const [resolving, setResolving] = useState(false);

  const status = exam.status ?? "PENDING";
  const isResolved = status === "RESOLVED" || status === "COMPLETED" || status === "APPROVED";

  const resolve = async () => {
    if (!exam.id || isResolved) return;
    setResolving(true);
    try {
      const res = await fetch("/api/exam/access-exceptions", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: exam.id, resolved: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success) {
        addToast({
          message: `Exam exception ${exam.id} resolved`,
          variant: "success",
        });
      } else {
        addToast({
          message: json.error?.message ?? "Failed to resolve exam exception",
          variant: "error",
        });
      }
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : "Failed to resolve exam exception",
        variant: "error",
      });
    } finally {
      setResolving(false);
    }
  };

  if (!role.isPrincipal) {
    return readOnlyNote(
      role,
      "exam clearances are acted on by the exam roles (OIE, exam branch, superintendent, principal)"
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={resolve}
        disabled={resolving || isResolved || !exam.id}
        className={
          "action-btn inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition " +
          (isResolved
            ? "bg-bg-elevated text-text-muted cursor-default"
            : "bg-action-primary text-white hover:opacity-90 disabled:opacity-50")
        }
      >
        {resolving ? "Resolving…" : isResolved ? "Resolved" : "Mark resolved"}
      </button>
      <a
        href="/principal/examinations"
        className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
      >
        Examination oversight
      </a>
      <a
        href="/principal/decisions"
        className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
      >
        Decision ledger
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  approval (permission ticket) — the shared model feeding the        */
/*  ApprovalsView inspector; replaces the local DetailSheet            */
/* ------------------------------------------------------------------ */

export interface ApprovalRecord {
  ticket_number: string;
  workflow_type?: string;
  status?: string;
  current_stage?: string;
  reason?: string | null;
  student_name?: string;
  roll?: string;
  hostel_block?: string;
  room_number?: string;
  sla_deadline?: string | null;
  created_at?: string;
}

export function buildApprovalInspection(
  approval: ApprovalRecord,
  gate: RoleGate
): EntityInspection {
  const status = approval.status ?? "PENDING";
  const isPending = status === "PENDING";
  const studentName = approval.student_name ?? "Unknown student";
  return {
    kind: "approval",
    title: `${approval.ticket_number} · ${approval.workflow_type ?? "request"}`,
    subtitle: studentName,
    status: badge(
      status,
      status === "APPROVED" ? "ok" : status === "REJECTED" ? "danger" : "warn"
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Request</dt>
              <dd className="mt-0.5 text-text-primary font-mono">
                <SmartTextRef text={approval.reason ?? approval.workflow_type ?? "—"} currentPath="/principal" />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd className="mt-0.5 text-text-primary">{status}</dd>
            </div>
            {approval.roll ? (
              <div>
                <dt className="text-text-muted">Roll</dt>
                <dd className="mt-0.5 font-mono text-text-primary">{approval.roll}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-muted">Created</dt>
              <dd className="mt-0.5 text-text-primary">
                {approval.created_at
                  ? new Date(approval.created_at).toLocaleString("en-IN")
                  : "—"}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                {gate.isPrincipal
                  ? "Principal (warden) — top of the approval chain"
                  : "The staged approval chain ending at the principal"}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                {[
                  approval.hostel_block ? `Hostel ${approval.hostel_block}` : null,
                  approval.room_number ? `Room ${approval.room_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Standard gate/hostel pass request"}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: isPending && gate.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={`/approver/permissions/${approval.ticket_number}`}
              className="action-btn inline-flex min-h-8 items-center bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Open ticket to act
            </a>
            <a
              href="/principal/decisions"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Decision ledger
            </a>
          </div>
        ) : isPending ? (
          readOnlyNote(
            gate,
            "acting on pending tickets requires the approver role at the current stage"
          )
        ) : (
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] text-text-muted">
              Ticket is {status.toLowerCase()} — no pending action required.
            </span>
          </div>
        ),
      },
    ],
    detailHref: `/approver/permissions/${approval.ticket_number}`,
    detailLabel: "View full ticket",
  };
}

/* ------------------------------------------------------------------ */
/*  report (week digest)                                              */
/* ------------------------------------------------------------------ */

export interface ReportRecord {
  workflow_type: string;
  count: number;
  totalPending?: number;
  totalApproved?: number;
  totalEscalated?: number;
}

export function buildReportInspection(
  report: ReportRecord,
  role: RoleGate
): EntityInspection {
  return {
    kind: "report",
    title: `${report.workflow_type} workflow volume`,
    subtitle: "7-day digest",
    status: badge(`${report.count} this week`, "neutral"),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Volume (7d)</dt>
              <dd className="mt-0.5 text-text-primary">{report.count}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Workflow</dt>
              <dd className="mt-0.5 text-text-primary">{report.workflow_type}</dd>
            </div>
            {report.totalPending !== undefined ? (
              <div>
                <dt className="text-text-muted">Pending now</dt>
                <dd className="mt-0.5 text-text-primary">{report.totalPending}</dd>
              </div>
            ) : null}
            {report.totalApproved !== undefined ? (
              <div>
                <dt className="text-text-muted">Decisions cleared</dt>
                <dd className="mt-0.5 text-text-primary">{report.totalApproved}</dd>
              </div>
            ) : null}
            {report.totalEscalated !== undefined ? (
              <div>
                <dt className="text-text-muted">Escalations</dt>
                <dd className="mt-0.5 text-text-primary">{report.totalEscalated}</dd>
              </div>
            ) : null}
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">
                Principal dashboard — aggregate of all approver activity
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Relationships</dt>
              <dd className="mt-0.5 text-text-primary">
                The pending, approved and escalated tickets behind each
                workflow category
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: role.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/approvals"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Pending approvals
            </a>
            <a
              href="/principal/decisions"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Decision ledger
            </a>
            <a
              href="/principal/escalations"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Escalations
            </a>
          </div>
        ) : (
          readOnlyNote(
            role,
            "the week digest is a read-only governance report"
          )
        ),
      },
    ],
    detailHref: "/principal/governance/reports",
    detailLabel: "View governance reports",
  };
}

/* ------------------------------------------------------------------ */
/*  person_exception — P0.2 ExceptionsView person rows + KPIs        */
/* ------------------------------------------------------------------ */

export interface PersonExceptionRecord {
  id: string;
  name: string;
  role?: string | null;
  designation?: string | null;
  department?: string | null;
  /** Which list this person came from: absent / late / flagged */
  exceptionKind: "absent" | "late" | "flagged";
  /** For late: minutes late. For flagged: reason string. */
  detail?: number | string;
}

export function buildPersonExceptionInspection(
  p: PersonExceptionRecord,
  gate: RoleGate
): EntityInspection {
  const tone =
    p.exceptionKind === "absent" ? "danger"
    : p.exceptionKind === "late" ? "warn"
    : "neutral";
  const statusLabel = p.exceptionKind.toUpperCase();
  const displayName = p.name;
  const subtitle = [p.department, p.designation ?? p.role].filter(Boolean).join(" · ") || p.id;

  return {
    kind: "person_exception",
    title: displayName,
    subtitle,
    status: badge(statusLabel, tone),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Role</dt>
              <dd className="mt-0.5 text-text-primary">{p.role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Department</dt>
              <dd className="mt-0.5 text-text-primary">{p.department ?? "—"}</dd>
            </div>
            {p.detail != null ? (
              <div>
                <dt className="text-text-muted">
                  {p.exceptionKind === "late" ? "Minutes late" : "Flag reason"}
                </dt>
                <dd className="mt-0.5 text-text-primary font-mono">
                  <SmartTextRef
                    text={p.exceptionKind === "late" ? `${p.detail}m` : String(p.detail)}
                    currentPath="/principal"
                  />
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-muted">Person ID</dt>
              <dd className="mt-0.5 font-mono text-text-primary">{p.id}</dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Context",
        content: (
          <dl className="grid grid-cols-1 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Exception type</dt>
              <dd className="mt-0.5 text-text-primary">
                {p.exceptionKind === "absent" && "Did not check in today"}
                {p.exceptionKind === "late" && `Arrived ${p.detail}m after gate open`}
                {p.exceptionKind === "flagged" && `Flagged: ${p.detail ?? "unspecified"}`}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Responsible authority</dt>
              <dd className="mt-0.5 text-text-primary">Principal oversight · HOD {p.department ?? ""}</dd>
            </div>
          </dl>
        ),
      },
      {
        title: "Actions",
        content: gate.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/people/attendance"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              All exceptions
            </a>
            <a
              href="/principal/attention"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Attention queue
            </a>
          </div>
        ) : (
          readOnlyNote(gate, "attendance exceptions are read-only for non-principal roles")
        ),
      },
    ],
    detailHref: "/principal/people/attendance",
    detailLabel: "View attendance exceptions",
  };
}

/* ------------------------------------------------------------------ */
/*  sla_cell — P0.10 AnalyticsView SLA heatmap cell inspector + KPIs */
/* ------------------------------------------------------------------ */

export interface SlaCellRecord {
  stage: string;
  total: number;
  withinSla: number;
  breached: number;
  rate: number;
  /** Per-workflow breakdown (from details[] in the /api/principal/sla-heatmap response). */
  byWorkflow?: Array<{ workflow_type: string; total: number; withinSla: number; breached: number }>;
}

export function buildSlaCellInspection(
  cell: SlaCellRecord,
  gate: RoleGate
): EntityInspection {
  const stageLabel = cell.stage.replace(/_/g, " ");
  const isBreached = cell.breached > 0;
  return {
    kind: "sla_cell",
    title: `${stageLabel} stage — SLA compliance`,
    subtitle: `${cell.total} tickets in flight · ${cell.rate}% on-time`,
    status: badge(
      isBreached ? `${cell.breached} BREACHED` : "COMPLIANT",
      isBreached ? "danger" : "ok"
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <dl className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <dt className="text-text-muted">Stage</dt>
              <dd className="mt-0.5 font-mono text-text-primary">{cell.stage}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Compliance</dt>
              <dd className="mt-0.5 text-text-primary">{cell.rate}%</dd>
            </div>
            <div>
              <dt className="text-text-muted">Total in flight</dt>
              <dd className="mt-0.5 text-text-primary">{cell.total}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Within SLA / Breached</dt>
              <dd className="mt-0.5 text-text-primary">
                {cell.withinSla} / {cell.breached}
              </dd>
            </div>
          </dl>
        ),
      },
      {
        title: "By workflow",
        content: cell.byWorkflow && cell.byWorkflow.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="text-left font-medium">Workflow</th>
                <th className="text-right font-medium">Total</th>
                <th className="text-right font-medium">Within</th>
                <th className="text-right font-medium">Breached</th>
              </tr>
            </thead>
            <tbody>
              {cell.byWorkflow.map((w) => (
                <tr key={w.workflow_type} className="border-t border-border">
                  <td className="py-1 text-text-primary">{w.workflow_type}</td>
                  <td className="py-1 text-right text-text-primary">{w.total}</td>
                  <td className="py-1 text-right text-text-primary">{w.withinSla}</td>
                  <td className={`py-1 text-right ${w.breached > 0 ? "text-action-danger" : "text-text-muted"}`}>
                    {w.breached}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-text-muted">Per-workflow breakdown not available.</p>
        ),
      },
      {
        title: "Actions",
        content: gate.isPrincipal ? (
          <div className="flex flex-wrap gap-2">
            <a
              href="/principal/approvals/overdue"
              className="action-btn inline-flex min-h-8 items-center bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              View overdue tickets
            </a>
            <a
              href="/principal/approvals"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Pending approvals
            </a>
            <a
              href="/principal/governance/analytics"
              className="action-btn inline-flex min-h-8 items-center bg-bg-elevated px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-surface"
            >
              Full analytics
            </a>
          </div>
        ) : (
          readOnlyNote(gate, "SLA analytics are read-only for non-principal roles")
        ),
      },
    ],
    detailHref: "/principal/governance/analytics",
    detailLabel: "View SLA analytics",
  };
}
