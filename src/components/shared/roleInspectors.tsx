"use client";

/**
 * roleInspectors — operator/supervisor/worker/caretaker inspection models
 * for the Unified Entity Inspector (EntityInspector + useEntityInspector).
 *
 * Design rule: every meaningful record on the (operator), (supervisor) and
 * caretaker consoles exposes the standardized progressive-disclosure
 * hierarchy: overview → context → history (collapsible) → actions, with a
 * role-gated Actions section built ONLY from routes the backend actually
 * authorizes for the calling role (checked against src/app/api/** role
 * allow-lists). No invented actions, no fake relationships.
 *
 * Role facts (from the API layer, src/server/policy/roles.ts + each route):
 *
 *   operator:  TIER.OPERATOR = ["operator","principal","admin","sysadmin"]
 *              - GET  /api/operator/transactions|stats|recent-scans (read log)
 *              - GET  /api/permissions?workflow_type=hostel&stage=main_gate (queue)
 *              - PATCH /api/permissions/[ticket] at main_gate stage (verify/reject)
 *              - GET  /api/gates (gate metadata; detail lives at /admin/gates/:id)
 *   supervisor:["supervisor","principal","admin","sysadmin"] on
 *              /api/supervisor/{dashboard,gate-live,escalations,shift,
 *              team-roster,claim-codes}; can decide escalated tickets via
 *              /api/permissions (supervisor stage) + /api/cases/[id]
 *   worker:    ["worker"] on /api/workers/my-shift|my-work|my-work-orders|
 *              personal-history — strictly read-only; no decide surface.
 *   caretaker: ["caretaker","admin","sysadmin"] on /api/caretaker/maintenance;
 *              complaints console (shared ComplaintConsole) is read/navigate.
 *
 * KPI tiles stay informational (hover previews where wired); rows/cards
 * open the inspector via `inspect(model)`.
 */

import {
  KVPairs,
  Timeline,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";
import { useEntityInspector } from "@/components/shared/useEntityInspector";
import { useAuthStore } from "@/stores/authStore";
import type { ReactNode } from "react";

const MONO = "font-mono text-xs";

/* ── tiny local status badge (mirrors entityResolvers' StatusBadge) ──────── */

function Pill({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/15 text-action-success",
    warn: "bg-amber-500/15 text-action-warning",
    danger: "bg-rose-500/15 text-action-danger",
    neutral: "bg-bg-elevated text-text-muted",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${cls[t]}`}>
      {text}
    </span>
  );
}

function note(text: string): ReactNode {
  return <p className="text-xs text-text-muted">{text}</p>;
}

/* ── transaction (gate scan / operator ledger) ─────────────────────────── */

export interface TxnRow {
  id: string;
  roll?: string | null;
  name?: string | null;
  person_type?: string | null;
  direction: string;
  reason?: string | null;
  gate_id?: string | null;
  gate_name?: string | null;
  timestamp: string;
  scan_type?: string | null;
  is_correction?: boolean | null;
}

export function transactionInspection(t: TxnRow, role?: string | null): EntityInspection {
  const denied = /denied|rejected|blocked/i.test(String(t.reason ?? ""));
  const corrected = Boolean(t.is_correction);
  const canReadGates = role === "operator" || role === "supervisor";

  return {
    kind: "transaction",
    title: t.name ?? t.roll ?? "Unknown",
    subtitle: t.roll ?? undefined,
    status: (
      <Pill
        text={denied ? "Denied" : corrected ? "Correction" : t.direction === "IN" ? "Entry" : "Exit"}
        tone={denied ? "danger" : corrected ? "warn" : "ok"}
      />
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Gate", value: t.gate_name ? <span className={MONO}>{t.gate_name}</span> : "—" },
              { label: "Direction", value: t.direction },
              { label: "Recorded", value: new Date(t.timestamp).toLocaleString() },
              ...(t.reason ? [{ label: "Reason", value: t.reason }] : []),
            ]}
          />
        ),
      },
      {
        title: "Timeline",
        collapsible: true,
        content: (
          <Timeline
            items={[
              { label: "Scan recorded", time: new Date(t.timestamp).toLocaleString(), tone: denied ? "danger" : "neutral" },
              ...(corrected
                ? [{ label: "Manual correction", detail: "Recorded by a gate operator", tone: "warn" as const }]
                : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            {canReadGates && t.gate_id ? (
              <InspectorButton href={`/admin/gates/${encodeURIComponent(t.gate_id)}`} variant="ghost">
                Gate status &amp; telemetry
              </InspectorButton>
            ) : null}
            {canReadGates
              ? note("Transaction log is read-only for your role. Corrections and escalations happen on the gate desk.")
              : note("Read-only record — no actions are authorized for your role on individual transactions.")}
          </div>
        ),
      },
    ],
  };
}

/* ── gate (supervisor live wall / activity) ────────────────────────────── */

export interface GateLiveRow {
  id: string;
  gateCode?: string;
  name: string;
  location?: string | null;
  isActive: boolean;
  onPost?: number;
  lastActivity?: string | null;
  recentEntries?: number;
  recentExits?: number;
}

export function gateLiveInspection(g: GateLiveRow, role?: string | null): EntityInspection {
  const canManageGates = role === "operator" || role === "supervisor";
  return {
    kind: "gate",
    title: g.name,
    subtitle: g.gateCode || g.id,
    status: (
      <Pill
        text={g.isActive ? (g.onPost && g.onPost > 0 ? "Staffed" : "Unstaffed") : "Inactive"}
        tone={g.isActive ? ((g.onPost ?? 0) > 0 ? "ok" : "warn") : "neutral"}
      />
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Location", value: g.location ?? "—" },
              { label: "Guards on post", value: g.onPost != null ? String(g.onPost) : "—" },
              ...(g.lastActivity
                ? [{ label: "Last activity", value: new Date(g.lastActivity).toLocaleString() }]
                : [{ label: "Last activity", value: "no activity recorded" }]),
            ]}
          />
        ),
      },
      {
        title: "Movement (last hour)",
        content: (
          <KVPairs
            items={[
              { label: "Entries", value: g.recentEntries != null ? String(g.recentEntries) : "—" },
              { label: "Exits", value: g.recentExits != null ? String(g.recentExits) : "—" },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            {canManageGates ? (
              <InspectorButton href={`/admin/gates/${encodeURIComponent(g.id)}`} variant="ghost">
                Gate status &amp; telemetry
              </InspectorButton>
            ) : note("Read-only gate status — gate configuration requires an admin role.")}
          </div>
        ),
      },
    ],
  };
}

/* ── exception (flagged / denied / manual scan) ────────────────────────── */

export type ExceptionTag = "Denied" | "Flagged" | "Manual" | "Correction";

export function exceptionInspection(t: TxnRow, tags: ExceptionTag[] = [], role?: string | null): EntityInspection {
  const model = transactionInspection(t, role);
  model.kind = "exception";
  model.status = <Pill text={tags[0] ?? "Flagged"} tone={tags[0] === "Denied" ? "danger" : "warn"} />;
  const sections = model.sections;
  sections.splice(1, 0, {
    title: "Context",
    content: (
      <KVPairs
        items={[
          { label: "Tags", value: tags.length ? tags.join(" · ") : "Flagged" },
          ...(t.person_type ? [{ label: "Person type", value: t.person_type }] : []),
          ...(t.scan_type ? [{ label: "Scan type", value: t.scan_type }] : []),
        ]}
      />
    ),
  });
  return model;
}

/* ── pass / permission ticket (gate-level verification queue) ──────────── */

export interface PassQueueRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  current_stage?: string;
  sla_deadline?: string | null;
  reason?: string | null;
  student?: {
    name?: string;
    unique_id?: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function passTicketInspection(
  p: PassQueueRow,
  opts: { role?: string | null; onVerify?: () => void; onReject?: () => void } = {},
): EntityInspection {
  const { role, onVerify, onReject } = opts;
  const ticket = p.ticket_number ?? p.id;
  const roll = p.student?.student_details?.roll;
  const sla = p.sla_deadline ? new Date(p.sla_deadline) : null;
  const breached = sla ? sla.getTime() < Date.now() : false;

  // PATCH /api/permissions/[ticket] authorizes the caller's own workflow
  // stage. The operator desk verifies the main_gate stage; the supervisor
  // decides the escalated supervisor stage. Both are real routes.
  const canVerify = role === "operator" && p.current_stage === "main_gate";
  const canDecide = role === "supervisor" && p.status === "ESCALATED";

  const actions: ReactNode[] = [];
  if (canVerify) {
    actions.push(
      <InspectorButton key="v" variant="primary" onClick={onVerify}>
        Verify &amp; Approve
      </InspectorButton>,
      <InspectorButton key="r" variant="danger" onClick={onReject}>
        Reject
      </InspectorButton>,
    );
  } else if (canDecide) {
    actions.push(
      <InspectorButton
        key="o"
        variant="primary"
        onClick={onVerify ?? (() => window.open(`/permissions/${encodeURIComponent(ticket)}`, "_blank"))}
      >
        Open ticket to decide
      </InspectorButton>,
    );
  } else {
    actions.push(
      <p key="n" className="text-xs text-text-muted">
        {role === "worker"
          ? "Read-only pass record — verifying or rejecting a pass requires the gate-operator role."
          : role === "caretaker"
            ? "Pass verification happens at the gate stage; your maintenance queue is separate."
            : "Deciding this ticket at this stage requires the supervisor role."}
      </p>,
    );
  }

  return {
    kind: "pass",
    title: p.student?.name ?? p.student?.unique_id ?? "Unknown applicant",
    subtitle: ticket,
    status: <Pill text={p.status ?? "PENDING"} tone={/rejected/i.test(p.status ?? "") ? "danger" : /approved/i.test(p.status ?? "") ? "ok" : "warn"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Workflow", value: p.workflow_type ?? "—" },
              { label: "Stage", value: p.current_stage ?? "—" },
              { label: "Roll", value: roll ? <span className={MONO}>{roll}</span> : "—" },
              ...(p.reason ? [{ label: "Reason", value: p.reason }] : []),
            ]}
          />
        ),
      },
      {
        title: "SLA",
        content: sla ? (
          <KVPairs
            columns={1}
            items={[
              { label: "Deadline", value: sla.toLocaleString() },
              {
                label: breached ? "State" : "Note",
                value: breached ? <span className="text-action-danger font-semibold">Breached</span> : "Within SLA",
              },
            ]}
          />
        ) : (
          <p className="text-xs text-text-muted">No SLA deadline set for this ticket.</p>
        ),
      },
      {
        title: "Timeline",
        collapsible: true,
        content: (
          <Timeline
            items={[
              { label: "Stage reached", detail: p.current_stage ?? p.status ?? undefined, tone: "neutral" },
              ...(breached ? [{ label: "SLA breached", tone: "danger" as const }] : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: <div className="flex flex-wrap gap-2">{actions}</div>,
      },
    ],
    detailHref: `/permissions/${encodeURIComponent(ticket)}`,
    detailLabel: "Full ticket detail",
  };
}

/* ── shift (supervisor shift / worker my-shift) ────────────────────────── */

export function shiftInspection(s: {
  shiftId?: string | null;
  startedAt?: string | null;
  endsAt?: string | null;
  isClean?: boolean;
  unresolvedIncidents?: number;
  gateCoverage?: { total: number; staffed: number };
  notes?: string;
}, role?: string | null): EntityInspection {
  const active = s.startedAt != null;
  const canHandover = role === "supervisor";
  return {
    kind: "shift",
    title: active ? "Active shift" : "No active shift",
    subtitle: s.shiftId ?? undefined,
    status: <Pill text={active ? (s.isClean ? "Clean" : "Attention needed") : "Inactive"} tone={active ? (s.isClean ? "ok" : "warn") : "neutral"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Started", value: s.startedAt ? new Date(s.startedAt).toLocaleString() : "—" },
              { label: "Ends", value: s.endsAt ? new Date(s.endsAt).toLocaleString() : "—" },
              ...(s.unresolvedIncidents != null
                ? [{ label: "Unresolved incidents", value: String(s.unresolvedIncidents) }]
                : []),
            ]}
          />
        ),
      },
      {
        title: "Gate coverage",
        content: s.gateCoverage ? (
          <KVPairs
            items={[
              { label: "Staffed", value: `${s.gateCoverage.staffed} / ${s.gateCoverage.total}` },
            ]}
          />
        ) : (
          <p className="text-xs text-text-muted">Coverage figures not available in this view.</p>
        ),
      },
      {
        title: "Handover",
        collapsible: true,
        content: s.notes ? (
          <p className="text-xs text-text-primary whitespace-pre-wrap">{s.notes}</p>
        ) : (
          <p className="text-xs text-text-muted">No handover notes logged for this shift yet.</p>
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            {canHandover ? (
              <InspectorButton href="/supervisor/shift/handover" variant="primary">
                Log shift handover
              </InspectorButton>
            ) : note(
              "Shift handover logging is a supervisor action; your role sees shift status read-only.",
            )}
          </div>
        ),
      },
    ],
  };
}

/* ── alert / incident (supervisor dashboard + response) ────────────────── */

export function alertInspection(a: {
  id: string;
  severity: string;
  title: string;
  timestamp: string;
  resolved: boolean;
}): EntityInspection {
  const sev = a.severity.toLowerCase();
  return {
    kind: "alert",
    title: a.title,
    subtitle: a.id,
    status: <Pill text={a.resolved ? "Resolved" : sev.toUpperCase()} tone={a.resolved ? "ok" : sev === "critical" || sev === "high" ? "danger" : "warn"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Severity", value: a.severity.toUpperCase() },
              { label: "Reported", value: new Date(a.timestamp).toLocaleString() },
              { label: "Status", value: a.resolved ? "Resolved" : "Open" },
            ]}
          />
        ),
      },
      {
        title: "Timeline",
        collapsible: true,
        content: (
          <Timeline
            items={[{ label: "Reported", time: new Date(a.timestamp).toLocaleString(), tone: a.resolved ? "ok" : "danger" }]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            <InspectorButton href="/supervisor/response/incidents" variant="ghost">
              All incidents
            </InspectorButton>
            {note("Resolving safety alerts requires the admin/principal role; supervisors triage and escalate on the response console.")}
          </div>
        ),
      },
    ],
  };
}

/* ── case (supervisor visible institutional cases) ─────────────────────── */

export function caseInspection(c: {
  id: string;
  ref?: string;
  type?: string;
  state?: string;
  risk?: string;
}): EntityInspection {
  return {
    kind: "case",
    title: c.ref ?? c.id,
    subtitle: c.type ?? "institutional case",
    status: <Pill text={c.state ?? "OPEN"} tone={(c.state ?? "").toLowerCase() === "resolved" ? "ok" : "warn"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Type", value: c.type ?? "—" },
              { label: "Risk", value: c.risk ?? "—" },
              { label: "State", value: c.state ?? "—" },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            <InspectorButton href="/supervisor/response/escalations" variant="ghost">
              Escalations console
            </InspectorButton>
            {note("Case decisions live in the escalation workflow — supervisors route; the deciding role acts on the ticket.")}
          </div>
        ),
      },
    ],
  };
}

/* ── request / work order (worker my-work-orders) ──────────────────────── */

export function requestInspection(r: {
  id: string;
  ticket: string;
  type?: string;
  stage?: string;
  status?: string;
  requesterName?: string;
  createdAt?: string;
  updatedAt?: string;
}): EntityInspection {
  const open = !/closed|resolved|done/i.test(r.status ?? "");
  return {
    kind: "request",
    title: r.ticket,
    subtitle: r.requesterName ?? undefined,
    status: <Pill text={r.status ?? "PENDING"} tone={open ? "warn" : "ok"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Type", value: r.type ?? "task" },
              { label: "Stage", value: r.stage ?? "—" },
              ...(r.requesterName ? [{ label: "Requester", value: r.requesterName }] : []),
              ...(r.createdAt ? [{ label: "Created", value: new Date(r.createdAt).toLocaleString() }] : []),
            ]}
          />
        ),
      },
      {
        title: "History",
        collapsible: true,
        content: (
          <Timeline
            items={[
              { label: "Assigned to you", time: r.createdAt ? new Date(r.createdAt).toLocaleString() : undefined },
              ...(r.updatedAt ? [{ label: "Last updated", time: new Date(r.updatedAt).toLocaleString(), tone: "ok" as const }] : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            {note("Work orders are read-only for the worker role — completion and reassignment happen through the caretaker/admin queue.")}
          </div>
        ),
      },
    ],
  };
}

/* ── asset / equipment (caretaker console) ─────────────────────────────── */

export function assetInspection(a: {
  id: string;
  name: string;
  category?: string;
  status?: string;
  location?: string;
}): EntityInspection {
  const open = !/resolved|ok|available/i.test(a.status ?? "");
  return {
    kind: "asset",
    title: a.name,
    subtitle: a.category ?? undefined,
    status: <Pill text={a.status ?? "Open"} tone={open ? "warn" : "ok"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Category", value: a.category ?? "—" },
              { label: "Location", value: a.location ?? "—" },
              { label: "Status", value: a.status ?? "—" },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <div className="flex flex-col gap-2">
            <InspectorButton href="/caretaker/maintenance" variant="ghost">
              Maintenance queue
            </InspectorButton>
            {note("Equipment records are tracked through the caretaker maintenance queue; updates are posted by the admin role.")}
          </div>
        ),
      },
    ],
  };
}

/* ── page-level host: <RoleInspectorHost /> ────────────────────────────── */

/**
 * Renders the shared EntityInspector once per page using the caller's
 * inspection state. Usage:
 *
 *   const host = useRoleInspectorHost();
 *   ... onClick={() => host.inspect(gateLiveInspection(g))}
 *   return <>{children}<RoleInspectorHost .../></>
 */
export function useRoleInspectorHost() {
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const role = useAuthStore((s) => s.user?.role ?? null);
  return { inspection, inspect, closeInspection, role };
}
