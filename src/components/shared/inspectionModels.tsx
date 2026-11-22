
import type { EntityInspection } from "@/components/shared/EntityInspector";
import { KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";
import { ChevronRight, ExternalLink } from "lucide-react";

/**
 * inspectionModels.tsx — the registry of standardized inspection models,
 * one per entity kind. This is where "the same inspect experience for
 * every entity" lives: each role surface composes from this registry
 * instead of hand-building a drawer per page.
 *
 * A model is a pure function `(entity) => EntityInspection`: it reads the
 * entity's fields and returns the standardized section hierarchy
 * (overview → context → history → actions + full-detail link). Role
 * filtering of the Actions section is the caller's job (see
 * useRoleContext) — the model always offers the full set, the caller
 * trims it.
 */

// ── helpers ────────────────────────────────────────────────────────────

const MONO = "font-mono text-xs";

/** The standardized "Actions" section for a gate entity. */
function gateActions(gateId: string, gateName: string) {
  return {
    title: "Actions",
    content: (
      <div className="flex flex-wrap gap-2">
        <InspectorButton href={`/admin/gates/${gateId}`} variant="ghost">
          <ChevronRight className="size-3.5" /> Status & telemetry
        </InspectorButton>
      </div>
    ),
  };
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
    kind: "scan",
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
        ),
      },
    ],
  };
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
                <div className="flex flex-wrap gap-2">
                  <InspectorButton href={`/admin/gates/${encodeURIComponent(v.gate)}`} variant="ghost">
                    <ChevronRight className="size-3.5" /> Gate detail
                  </InspectorButton>
                </div>
              ),
            },
          ]
        : []),
    ],
  };
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
          <div className="flex flex-wrap gap-2">
            <InspectorButton
              onClick={onOpenDetail ?? (() => window.open("/permissions/" + t.ticket))}
              variant="primary"
            >
              <ChevronRight className="size-3.5" /> Open full detail
            </InspectorButton>
          </div>
        ),
      },
    ],
  };
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
          <div className="flex flex-wrap gap-2">
            <InspectorButton onClick={onOpenDetail} variant="primary">
              <ChevronRight className="size-3.5" /> Open full detail
            </InspectorButton>
          </div>
        ),
      },
    ],
  };
}
