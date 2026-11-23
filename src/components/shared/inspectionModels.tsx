
import type { EntityInspection } from "@/components/shared/EntityInspector";
import { KVPairs, Timeline, InspectorButton, ActionGate } from "@/components/shared/EntityInspector";
import { useCanActEntity } from "@/components/shared/useCanActEntity";
import { ChevronRight, ExternalLink } from "lucide-react";

/**
 * inspectionModels.tsx — the registry of standardized inspection models,
 * one per entity kind. This is where "the same inspect experience for
 * every entity" lives: each role surface composes from this registry
 * instead of hand-building a drawer per page.
 *
 * A model is a pure function `(entity) => EntityInspection`: it reads the
 * entity's fields and returns the standardized section hierarchy
 * (overview → context → history → actions + full-detail link).
 *
 * Action gating: each model's "Actions" section wraps its *write*
 * `InspectorButton`s in an `ActionGate canAct={useCanActEntity(kind)}`
 * so the action bar hides (not disables) when the role lacks write
 * capability for that entity kind. Navigation-only "Open full detail"
 * / "View full detail" CTAs are NOT wrapped in the gate — they are
 * links, not writes, and stay visible to every role that can inspect.
 *
 * The hook runs inside a React component that is the JSX `content`
 * element of the model's "Actions" section — that component is what
 * gets mounted into the page's component tree, so React sees the
 * hook in a valid context. The model builder itself stays pure:
 * `gateInspection(g)` / `scanInspection(s)` / … return an
 * `EntityInspection` whose `content` is JSX (not a string) that
 * references the Gated* components; those components call the hook.
 */

// ── helpers ────────────────────────────────────────────────────────────

const MONO = "font-mono text-xs";

/**
 * The standardized "Actions" section for a gate entity. The actual
 * gating is done by the `GatedGateActions` React component (hook runs
 * in the JSX render pass, not in this pure builder).
 */
function gateActions(gateId: string, _gateName: string) {
  return {
    title: "Actions",
    content: <GatedGateActions gateId={gateId} />,
  };
}

/**
 * React component for the gate Actions section. Hook runs in the JSX
 * render pass — see module doc. operator/supervisor/warden/vp/
 * principal/admin/sysadmin can act; everyone else (student/faculty/
 * hostel-manager/…) sees a muted read-only note instead.
 */
function GatedGateActions({
  gateId,
}: {
  gateId: string;
}) {
  const canAct = useCanActEntity("gate");
  return (
    <ActionGate canAct={canAct}>
      <div className="flex flex-wrap gap-2">
        <InspectorButton href={`/admin/gates/${gateId}`} variant="ghost">
          <ChevronRight className="size-3.5" /> Status & telemetry
        </InspectorButton>
      </div>
    </ActionGate>
  );
}

// ── gate ───────────────────────────────────────────────────────────────

export interface GateModel {
  id: string;
  gateCode: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
  audience?: string | null;
}

export function gateInspection(g: GateModel): EntityInspection {
  return {
    kind: "gate",
    title: g.name,
    subtitle: g.gateCode,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          g.isActive ? "bg-emerald-500/15 text-action-success" : "bg-rose-500/15 text-action-danger"
        }`}
      >
        {g.isActive ? "Active" : "Inactive"}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Code", value: <span className={MONO}>{g.gateCode}</span> },
              { label: "Location", value: g.location },
              { label: "Type", value: g.type },
              { label: "Audience", value: g.audience ?? "all" },
            ]}
          />
        ),
      },
      gateActions(g.id, g.name),
    ],
    detailHref: `/admin/gates/${g.id}`,
    detailLabel: "Gate status & telemetry",
  };
}

// ── scan transaction (operator ledger / exceptions) ──────────────────

export interface ScanModel {
  id: string;
  roll: string | null;
  name: string | null;
  person_type: string | null;
  direction: string;
  reason: string | null;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
  scan_type: string | null;
  is_correction: boolean | null;
}

export function scanInspection(s: ScanModel): EntityInspection {
  const isDenied = /denied|rejected|blocked/i.test(String(s.reason ?? ""));
  return {
    kind: "exception",
    title: s.name ?? s.roll ?? "Unknown",
    subtitle: s.roll,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          isDenied
            ? "bg-rose-500/15 text-action-danger"
            : s.is_correction
              ? "bg-amber-500/15 text-action-warning"
              : s.direction === "IN"
                ? "bg-emerald-500/15 text-action-success"
                : "bg-sky-500/15 text-action-info"
        }`}
      >
        {isDenied ? "Denied" : s.is_correction ? "Correction" : s.direction === "IN" ? "Entry" : "Exit"}
      </span>
    ),
    sections: [
      {
        title: "Context",
        content: (
          <KVPairs
            items={[
              {
                label: "Gate",
                value: s.gate_name ? (
                  <span className={MONO}>{s.gate_name}</span>
                ) : (
                  "—"
                ),
              },
              { label: "Direction", value: s.direction },
              { label: "Scan type", value: s.scan_type ?? "auto" },
              { label: "Person type", value: s.person_type ?? "—" },
              ...(s.reason ? [{ label: "Reason", value: s.reason }] : []),
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
              {
                label: "Scan recorded",
                time: new Date(s.timestamp).toLocaleString(),
                tone: isDenied ? "danger" : "neutral",
              },
              ...(s.is_correction
                ? [
                    {
                      label: "Manual correction",
                      detail: "Recorded by a gate operator",
                      tone: "warn" as const,
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          // Hook in JSX render pass — see module doc.
          <GatedScanActions s={s} />
        ),
      },
    ],
  };
}

/**
 * Actions section for a scan transaction: navigational links to the
 * referenced student + gate. Gate-act only — the operator role is the
 * natural actor here (operator/supervisor/warden/admin/sysadmin).
 */
function GatedScanActions({ s }: { s: ScanModel }) {
  const canAct = useCanActEntity("gate");
  return (
    <ActionGate
      canAct={canAct}
      fallbackNote={
        <>
          <p className="text-xs text-text-muted">
            Acting on this record requires an operator, supervisor,
            deputy-warden, VP, principal, admin or sysadmin role.
          </p>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {s.roll ? (
          <InspectorButton href={`/admin/students/${s.roll}`} variant="ghost">
            <ExternalLink className="size-3.5" /> Student record
          </InspectorButton>
        ) : null}
        {s.gate_id ? (
          <InspectorButton href={`/admin/gates/${s.gate_id}`} variant="ghost">
            <ExternalLink className="size-3.5" /> Gate detail
          </InspectorButton>
        ) : null}
      </div>
    </ActionGate>
  );
}

// ── visitor ────────────────────────────────────────────────────────────

export interface VisitorModel {
  id: string;
  name: string | null;
  purpose: string | null;
  host: string | null;
  gate: string | null;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export function visitorInspection(v: VisitorModel): EntityInspection {
  return {
    kind: "visitor",
    title: v.name ?? "Unknown visitor",
    subtitle: v.purpose,
    status: (
      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
        {v.status}
      </span>
    ),
    sections: [
      {
        title: "Context",
        content: (
          <KVPairs
            items={[
              { label: "Purpose", value: v.purpose ?? "—" },
              { label: "Host", value: v.host ?? "—" },
              { label: "Gate", value: <span className={MONO}>{v.gate ?? "—"}</span> },
            ]}
          />
        ),
      },
      {
        title: "Visit timeline",
        collapsible: true,
        content: (
          <KVPairs
            items={[
              {
                label: "Checked in",
                value: v.checkInAt ? new Date(v.checkInAt).toLocaleString("en-IN") : "—",
              },
              {
                label: "Checked out",
                value: v.checkOutAt
                  ? new Date(v.checkOutAt).toLocaleString("en-IN")
                  : "Still on campus",
              },
            ]}
          />
        ),
      },
      ...(v.gate
        ? [
            {
              title: "Actions",
              content: (
                // Hook in JSX render pass — see module doc.
                <GatedVisitorActions v={v} />
              ),
            },
          ]
        : []),
    ],
  };
}

/**
 * Actions section for a visitor: navigational link to the gate. The
 * "exception" / "visitor" / "scan" kinds are not in the ENTITY_ACTION
 * map, so the gate falls back to admin/sysadmin only — which is
 * correct: the only visitors who need to act on the gate detail page
 * are operators/supervisors/wardevs/VPS/principals/admins.
 */
function GatedVisitorActions({ v }: { v: VisitorModel }) {
  // Visitor records are acted on via the gate detail page — use "gate"
  // as the coarse kind. The map's privileged fallback covers admin +
  // sysadmin for the rare visitor-record-only case.
  const canAct = useCanActEntity("gate");
  return (
    <ActionGate canAct={canAct}>
      <div className="flex flex-wrap gap-2">
        <InspectorButton href={`/admin/gates/${encodeURIComponent(v.gate ?? "")}`} variant="ghost">
          <ChevronRight className="size-3.5" /> Gate detail
        </InspectorButton>
      </div>
    </ActionGate>
  );
}

// ── permission / leave ticket ─────────────────────────────────────────

export interface TicketModel {
  ticket: string;
  studentName: string;
  studentRoll: string;
  passType: string;
  status: string;
  currentStage?: string;
  reason?: string;
}

/**
 * The lightweight ticket model for list surfaces. The heavy detail (the
 * full approve/reject/forward workflow + QR + documents + co-sign) stays
 * in PermissionDetailPanel — this model only standardizes the *row →
 * quick overview* layer; "Open full detail" hands off to the existing
 * panel via detailHref.
 */
export function ticketInspection(t: TicketModel, onOpenDetail?: () => void): EntityInspection {
  return {
    kind: "permission ticket",
    title: t.studentName,
    subtitle: t.studentRoll,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          /pending/i.test(t.status)
            ? "bg-amber-500/15 text-action-warning"
            : /approved/i.test(t.status)
              ? "bg-emerald-500/15 text-action-success"
              : /rejected|denied/i.test(t.status)
                ? "bg-rose-500/15 text-action-danger"
                : "bg-bg-elevated text-text-muted"
        }`}
      >
        {t.status}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Ticket", value: <span className={MONO}>{t.ticket}</span> },
              { label: "Pass type", value: t.passType },
              {
                label: "Current stage",
                value: t.currentStage ?? "—",
              },
              ...(t.reason ? [{ label: "Reason", value: t.reason }] : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          // Record-state + capability gate (hook in JSX render pass —
          // see module doc). Approve/Reject/Forward are writes and only
          // show when status is actionable (pending/escalated) AND the
          // role has ticket write access. "Open full detail" is a
          // navigation link and stays ungated.
          <GatedTicketActions t={t} onOpenDetail={onOpenDetail} />
        ),
      },
    ],
  };
}

/**
 * Actions section for a permission/leave ticket: the Approve/Reject/
 * Forward buttons only render when status is pending or escalated AND
 * the role has ticket write access. Navigation-only "Open full detail"
 * stays visible to every role that can inspect the record.
 */
function GatedTicketActions({
  t,
  onOpenDetail,
}: {
  t: TicketModel;
  onOpenDetail?: () => void;
}) {
  const canAct = useCanActEntity("ticket");
  const status = t.status.toLowerCase();
  const actionableStatus =
    /pending|escalated|open|in.review|under.review/i.test(status);
  return (
    <div className="flex flex-wrap gap-2">
      {actionableStatus ? (
        <ActionGate canAct={canAct}>
          <InspectorButton
            onClick={onOpenDetail ?? (() => window.open("/permissions/" + t.ticket))}
            variant="primary"
          >
            <ChevronRight className="size-3.5" /> Review & act
          </InspectorButton>
        </ActionGate>
      ) : null}
      <InspectorButton
        onClick={onOpenDetail ?? (() => window.open("/permissions/" + t.ticket))}
        variant="ghost"
      >
        <ChevronRight className="size-3.5" /> Open full detail
      </InspectorButton>
    </div>
  );
}


// ── rich permission ticket (maps PermissionItem directly) ────────────

export interface RichTicketModel {
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  reason?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  student?: { name?: string; student_details?: { roll?: string; hostel_block?: string; year?: number } } | null;
  sla_deadline?: string | null;
}

/**
 * Standardized ticket inspection that maps the live PermissionItem shape
 * (what PermissionList rows carry) straight into the model — no
 * per-row reshaping. The heavy workflow (approve / reject / forward +
 * QR + documents + co-sign) stays in PermissionDetailPanel; this is
 * the row → quick-overview layer with a stage-history timeline.
 */
export function richTicketInspection(
  t: RichTicketModel,
  onOpenDetail: () => void,
  stageHistory?: Array<{ actorName: string; action: string; toStage?: string; timestamp: string }>,
): EntityInspection {
  const roll = t.student?.student_details?.roll ?? t.ticket_number;
  return {
    kind: "permission ticket",
    title: t.student?.name ?? roll,
    subtitle: roll,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          /pending/i.test(t.status)
            ? "bg-amber-500/15 text-action-warning"
            : /approved|granted/i.test(t.status)
              ? "bg-emerald-500/15 text-action-success"
              : /rejected|denied/i.test(t.status)
                ? "bg-rose-500/15 text-action-danger"
                : "bg-bg-elevated text-text-muted"
        }`}
      >
        {t.status}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Ticket", value: <span className={MONO}>{t.ticket_number}</span> },
              { label: "Workflow", value: t.workflow_type },
              { label: "Stage", value: t.current_stage },
              ...(t.reason ? [{ label: "Reason", value: t.reason }] : []),
              ...(t.from_date
                ? [
                    {
                      label: "Valid",
                      value: `${new Date(t.from_date).toLocaleDateString("en-IN")}${
                        t.to_date ? " → " + new Date(t.to_date).toLocaleDateString("en-IN") : ""
                      }`,
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
      ...(stageHistory && stageHistory.length
        ? [
            {
              title: "Stage history",
              collapsible: true,
              content: (
                <Timeline
                  items={stageHistory.map((h) => ({
                    label: `${h.actorName} — ${h.action}${h.toStage ? ` → ${h.toStage}` : ""}`,
                    time: new Date(h.timestamp).toLocaleString(),
                    tone: "neutral" as const,
                  }))}
                />
              ),
            },
          ]
        : []),
      {
        title: "Actions",
        content: (
          // Record-state + capability gate (hook in JSX render pass).
          // The review/act button only renders when status is
          // actionable (pending/escalated) AND the role has ticket
          // write access. Navigation-only "Open full detail" stays
          // ungated.
          <GatedRichTicketActions t={t} onOpenDetail={onOpenDetail} />
        ),
      },
    ],
  };
}

/**
 * Actions section for the rich ticket model (maps PermissionItem
 * directly): the Approve/Reject/Forward write buttons only render when
 * status is pending or escalated AND the role has ticket write access.
 * Navigation-only "Open full detail" stays visible to every role that
 * can inspect the record.
 */
function GatedRichTicketActions({
  t,
  onOpenDetail,
}: {
  t: RichTicketModel;
  onOpenDetail: () => void;
}) {
  const canAct = useCanActEntity("ticket");
  const status = t.status.toLowerCase();
  const actionableStatus =
    /pending|escalated|open|in.review|under.review/i.test(status);
  return (
    <div className="flex flex-wrap gap-2">
      {actionableStatus ? (
        <ActionGate canAct={canAct}>
          <InspectorButton onClick={onOpenDetail} variant="primary">
            <ChevronRight className="size-3.5" /> Review & act
          </InspectorButton>
        </ActionGate>
      ) : null}
      <InspectorButton onClick={onOpenDetail} variant="ghost">
        <ChevronRight className="size-3.5" /> Open full detail
      </InspectorButton>
    </div>
  );
}

// Re-export the pass model (kept in its own file to keep the registry
// import surface stable).
export { passInspection, type PassModel } from "./passInspection.model";


// ── complaint (complaint console, all roles) ──────────────────────────

export interface ComplaintModel {
  complaintNumber: string;
  title: string;
  categoryLabel: string;
  priority: string;
  status: string;
  currentOwnerRole: string;
  slaDeadline: string | null;
  createdAt: string;
  raisedByName: string | null;
}

/** Standardized inspection for a complaint: overview → ownership → SLA timeline. */
export function complaintInspection(
  c: ComplaintModel,
  onOpenDetail?: () => void,
): EntityInspection {
  const closed = c.status === "resolved" || c.status === "closed";
  const isOverdue =
    c.slaDeadline && new Date(c.slaDeadline).getTime() < Date.now() && !closed;
  return {
    kind: "complaint",
    title: c.title,
    subtitle: c.complaintNumber,
    status: (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
          closed
            ? "bg-emerald-500/15 text-action-success"
            : isOverdue
              ? "bg-rose-500/15 text-action-danger"
              : "bg-amber-500/15 text-action-warning"
        }`}
      >
        {closed ? "Closed" : isOverdue ? "SLA breached" : c.status}
      </span>
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Category", value: c.categoryLabel },
              { label: "Priority", value: c.priority },
              { label: "Raised by", value: c.raisedByName ?? "—" },
              {
                label: "Current owner",
                value: <span className={MONO}>{c.currentOwnerRole}</span>,
              },
            ]}
          />
        ),
      },
      {
        title: "SLA",
        content: c.slaDeadline ? (
          <KVPairs
            columns={1}
            items={[
              {
                label: "Deadline",
                value: new Date(c.slaDeadline).toLocaleString("en-IN"),
              },
              {
                label: isOverdue ? "State" : "Time left",
                value: isOverdue ? (
                  <span className="text-action-danger font-semibold">Breached</span>
                ) : (
                  "Within SLA"
                ),
              },
            ]}
          />
        ) : (
          <p className="text-xs text-text-muted">No SLA set for this complaint.</p>
        ),
      },
      {
        title: "Actions",
        content: (
          // Capability gate on the write (review/act). Record-state
          // check: only show when not resolved/closed. Navigation-only
          // "Open full detail" stays ungated.
          <GatedComplaintActions c={c} onOpenDetail={onOpenDetail} />
        ),
      },
    ],
  };
}

/**
 * Actions section for a complaint: the write (review/act) button only
 * renders when the complaint is not resolved/closed AND the role has
 * complaint write access. Navigation-only "Open full detail" stays
 * visible to every role that can inspect the record.
 */
function GatedComplaintActions({
  c,
  onOpenDetail,
}: {
  c: ComplaintModel;
  onOpenDetail?: () => void;
}) {
  const canAct = useCanActEntity("complaint");
  const actionableStatus =
    c.status !== "resolved" && c.status !== "closed";
  return (
    <div className="flex flex-wrap gap-2">
      {actionableStatus ? (
        <ActionGate canAct={canAct}>
          <InspectorButton
            onClick={onOpenDetail ?? (() => undefined)}
            variant="primary"
          >
            <ChevronRight className="size-3.5" /> Review & act
          </InspectorButton>
        </ActionGate>
      ) : null}
      <InspectorButton
        onClick={onOpenDetail ?? (() => undefined)}
        variant="ghost"
      >
        <ChevronRight className="size-3.5" /> Open full detail
      </InspectorButton>
    </div>
  );
}
