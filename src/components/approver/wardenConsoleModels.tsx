"use client";

/**
 * wardenConsoleModels — standardized EntityInspection builders for the
 * warden / hostel / mess / VP consoles (PR-05E).
 *
 * Design rule: every meaningful record in these consoles goes through the
 * shared EntityInspector. The builders here produce the `EntityInspection`
 * models for the entity kinds used by the hostel / deputy-warden / mess /
 * vice-principal record surfaces:
 *
 *   - permission ticket (rows in outpass / leave / delegated queues)
 *   - hostel block (occupancy)
 *   - gate (presence-matrix movement)
 *   - incident / alert
 *   - shift handover
 *   - menu + stock item (mess)
 *   - meal day (consumption / attendance)
 *   - mess operational request
 *   - academic department + exception (VP)
 *   - VP escalation / decision
 *
 * Actions in the models are only links to routes these roles can actually
 * call (no invented actions): ticket detail via /api/permissions/[ticket],
 * alert resolve via PATCH /api/alerts/[id] (roles in the allow-list keep
 * their existing in-page buttons), and navigation CTAs to the deepest
 * layer (the existing consoles).
 */

import {
  KVPairs,
  Timeline,
  ActionRow,
  InspectorButton,
  type EntityInspection,
  type InspectionSection,
} from "@/components/shared/EntityInspector";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { formatDateTime } from "@/lib/utils";

/* ── small shared status badge (kept local so the console files don't
     pull in a Badge dependency graph) ─────────────────────────────────── */

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/* ── helpers ───────────────────────────────────────────────────────────── */

function fmtLocal(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ── permission ticket (outpass / leave / delegated / OIE queues) ─────── */

/** The shape KanbanBoard hands back on select — a flattened permission row. */
export interface HMBoardRow {
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
  created_at?: string | null;
}

/**
 * Build an inspection for a permission-ticket row (outpass / hostel /
 * exam / memo queues). Sections: overview → stage history (collapsible)
 * → actions (CTAs only: open the ticket in the deepest layer, the
 * existing consoles that already run the real routes).
 */
export function boardRowTicketInspection(
  row: HMBoardRow,
  opts?: { consoleHref?: string; consoleLabel?: string },
): EntityInspection {
  const status = /pending/i.test(row.direction) ? "PENDING" : row.direction;
  return {
    kind: "permission ticket",
    title: row.name ?? row.roll ?? row.id,
    subtitle: row.roll ? `${row.id} · ${row.roll}` : row.id,
    status: (
      <StatusBadge
        text={status}
        tone={/pending/i.test(status) ? "warn" : /approved|completed/i.test(status) ? "ok" : "danger"}
      />
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Ticket", value: row.id },
              { label: "Workflow", value: (row.scan_type ?? "").replace(/_/g, " ") || "—" },
              { label: "Person", value: row.name ?? "—" },
              { label: "Roll", value: row.roll ?? "—" },
              { label: "Status", value: row.direction },
              ...(row.reason ? [{ label: "Reason", value: row.reason }] : []),
              { label: "Recorded", value: fmtLocal(row.timestamp) },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton
              href={`/permissions/${encodeURIComponent(row.id)}`}
              variant="primary"
            >
              Open ticket detail
            </InspectorButton>
            <InspectorButton href={opts?.consoleHref ?? "/"} variant="ghost">
              {opts?.consoleLabel ?? "Back to console"}
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: opts?.consoleHref ?? `/permissions/${encodeURIComponent(row.id)}`,
    detailLabel: opts?.consoleLabel ?? "Queue",
  };
}

export function ticketRowInspection(
  t: Pick<
    PermissionItem,
    | "ticket_number"
    | "workflow_type"
    | "status"
    | "current_stage"
    | "reason"
    | "created_at"
    | "updated_at"
    | "sla_deadline"
    | "stage_history"
    | "student"
  >,
  opts?: { detailHref?: string; detailLabel?: string; consoleLabel?: string },
): EntityInspection {
  const statusTone: "ok" | "warn" | "danger" | "neutral" =
    t.status === "APPROVED" || t.status === "COMPLETED"
      ? "ok"
      : t.status === "REJECTED" || t.status === "CANCELLED"
        ? "danger"
        : t.status === "ESCALATED"
          ? "warn"
          : "warn";

  const roll = t.student?.student_details?.roll;
  const historyItems = (t.stage_history ?? [])
    .filter((h) => h.actorName || h.action)
    .map((h) => ({
      label: `${h.actorName ?? "System"} ${h.action.toLowerCase()}${h.toStage ? ` → ${h.toStage}` : ""}`,
      time: h.timestamp ? formatDateTime(h.timestamp) : undefined,
      detail: h.comment ?? undefined,
      tone: (h.action === "FORWARDED" || h.action === "ESCALATED" ? "warn" : "neutral") as
        | "warn"
        | "neutral",
    }));

  const sections: InspectionSection[] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Workflow", value: String(t.workflow_type ?? "").replace(/_/g, " ") || "—" },
            { label: "Current stage", value: (t.current_stage ?? "").replace(/_/g, " ") || "—" },
            { label: "Student", value: t.student?.name ?? "—" },
            { label: "Roll", value: roll ?? "—" },
            { label: "Reason", value: t.reason ?? "—" },
            { label: "Created", value: fmtLocal(t.created_at) },
            {
              label: "SLA deadline",
              value: t.sla_deadline ? (
                new Date(t.sla_deadline).getTime() < Date.now() ? (
                  <span className="text-action-danger font-semibold">Breached · {fmtLocal(t.sla_deadline)}</span>
                ) : (
                  fmtLocal(t.sla_deadline)
                )
              ) : (
                "—"
              ),
            },
          ]}
        />
      ),
    },
  ];

  if (historyItems.length > 0) {
    sections.push({
      title: "Stage history",
      collapsible: true,
      content: <Timeline items={historyItems} />,
    });
  }

  sections.push({
    title: "Actions",
    content: (
      <ActionRow>
        <InspectorButton
          href={`/permissions/${encodeURIComponent(t.ticket_number)}`}
          variant="primary"
        >
          Open ticket detail
        </InspectorButton>
        <InspectorButton
          href={opts?.detailHref ?? "/"}
          variant="ghost"
        >
          {opts?.consoleLabel ?? "Back to console"}
        </InspectorButton>
      </ActionRow>
    ),
  });

  return {
    kind: "permission ticket",
    title: t.student?.name ?? t.ticket_number,
    subtitle: `${t.ticket_number} · ${String(t.workflow_type ?? "").replace(/_/g, " ")}`,
    status: <StatusBadge text={t.status} tone={statusTone} />,
    sections,
    detailHref: opts?.detailHref ?? `/permissions/${encodeURIComponent(t.ticket_number)}`,
    detailLabel: opts?.detailLabel ?? "Full ticket detail",
  };
}

/* ── hostel block (occupancy) ──────────────────────────────────────────── */

export interface HostelBlockOccupancy {
  block: string;
  total: number;
  occupied: number;
}

export function hostelBlockInspection(b: HostelBlockOccupancy): EntityInspection {
  const pct = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
  const tone: "ok" | "warn" | "danger" = pct >= 95 ? "danger" : pct >= 80 ? "warn" : "ok";
  return {
    kind: "hostel_block",
    title: `Block ${b.block}`,
    subtitle: `occupancy ${pct}%`,
    status: <StatusBadge text={`${b.occupied}/${b.total} occupied`} tone={tone} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Block", value: b.block },
              { label: "Allocated", value: String(b.total) },
              { label: "Currently in", value: String(b.occupied) },
              {
                label: "Occupancy",
                value: `${pct}%`,
              },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <p className="text-xs text-text-muted">
            Block occupancy aggregates campus-occupancy (IN) headcount per
            hostel block. Room-level and resident-level detail is exposed
            in the admin student roster.
          </p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/admin/students" variant="ghost">
              Open student roster
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/admin/students",
    detailLabel: "Student roster",
  };
}

/* ── gate (presence matrix movement) ───────────────────────────────────── */

export interface GatePresenceRow {
  id: string;
  name: string;
  code: string;
  audience: string;
  type: string;
  onCampus: number;
}

export function gatePresenceInspection(g: GatePresenceRow): EntityInspection {
  return {
    kind: "gate",
    title: g.name || g.code,
    subtitle: g.code,
    status: <StatusBadge text={`${g.onCampus} on campus`} tone={g.onCampus > 0 ? "ok" : "neutral"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Audience", value: g.audience },
              { label: "Type", value: g.type },
              { label: "On campus now", value: String(g.onCampus) },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href={`/admin/gates/${encodeURIComponent(g.id)}`} variant="ghost">
              Gate telemetry
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: `/admin/gates/${encodeURIComponent(g.id)}`,
    detailLabel: "Gate detail & telemetry",
  };
}

/* ── incident / alert ──────────────────────────────────────────────────── */

export interface IncidentRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  created_at?: string | null;
  source?: string | null;
}

export function incidentInspection(a: IncidentRow): EntityInspection {
  const sev = (a.severity ?? "").toLowerCase();
  const sevTone: "ok" | "warn" | "danger" =
    sev === "critical" || sev === "high" ? "danger" : sev === "medium" || sev === "warning" ? "warn" : "ok";
  const resolved = ["RESOLVED", "DISMISSED", "CLOSED"].includes(a.status);
  return {
    kind: "incident",
    title: a.title,
    subtitle: a.id,
    status: <StatusBadge text={a.status} tone={resolved ? "ok" : sevTone} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Severity", value: a.severity?.toUpperCase() ?? "—" },
              { label: "Status", value: a.status },
              { label: "Source", value: a.source ?? "—" },
              { label: "Created", value: fmtLocal(a.created_at ?? null) },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <p className="text-xs text-text-muted">
            Alert records come from the campus gate & incident feed.
            Resolve / dismiss runs from the alert console; this panel is
            read-only at this tier.
          </p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/admin/alerts" variant="ghost">
              Open alerts console
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/admin/alerts",
    detailLabel: "All alerts",
  };
}

/* ── shift handover ────────────────────────────────────────────────────── */

export interface HandoverItem {
  type: string;
  title: string;
  details?: string;
  severity?: string;
}

export interface HandoverRecord {
  id: string;
  toRole: string;
  items: HandoverItem[];
  notes?: string | null;
  byName?: string | null;
  createdAt: string;
}

export function shiftHandoverInspection(h: HandoverRecord): EntityInspection {
  const highSeverity = (h.items ?? []).some(
    (it) => (it.severity ?? "").toLowerCase() === "high" || (it.severity ?? "").toLowerCase() === "critical",
  );
  return {
    kind: "shift",
    title: `Shift handover → ${h.toRole}`,
    subtitle: h.id,
    status: (
      <StatusBadge
        text={`${(h.items ?? []).length} item(s)`}
        tone={highSeverity ? "warn" : "neutral"}
      />
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "From", value: h.byName ?? "previous shift" },
              { label: "To role", value: h.toRole },
              { label: "Handed over", value: fmtLocal(h.createdAt) },
              ...(h.notes ? [{ label: "Notes", value: h.notes }] : []),
            ]}
          />
        ),
      },
      {
        title: "Handover items",
        collapsible: true,
        content:
          (h.items ?? []).length > 0 ? (
            <Timeline
              items={(h.items ?? []).map((it, i) => ({
                label: `${it.type} · ${it.title}`,
                detail: it.details ?? undefined,
                tone: (it.severity ? "warn" : "neutral") as "warn" | "neutral",
                time: undefined,
              }))}
            />
          ) : (
            <p className="text-xs text-text-muted">No structured items recorded.</p>
          ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/deputy-warden/shift-handover" variant="ghost">
              All handovers
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/deputy-warden/shift-handover",
    detailLabel: "Shift handover log",
  };
}

/* ── mess: menu + stock item ───────────────────────────────────────────── */

export interface MenuDayInfo {
  mealDate: string | null;
  windowOpens: string | null;
  windowCloses: string | null;
}

export interface MessMenuItem {
  id: string;
  code: string;
  label: string;
  isAvailable: boolean;
}

export function menuInspection(item: MessMenuItem, day: MenuDayInfo): EntityInspection {
  return {
    kind: "menu",
    title: item.label,
    subtitle: item.code,
    status: <StatusBadge text={item.isAvailable ? "AVAILABLE" : "UNAVAILABLE"} tone={item.isAvailable ? "ok" : "neutral"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Item", value: item.label },
              { label: "Code", value: item.code },
              { label: "Availability", value: item.isAvailable ? "Available" : "Unavailable" },
            ]}
          />
        ),
      },
      {
        title: "Meal day",
        content: (
          <KVPairs
            items={[
              { label: "Date", value: fmtLocal(day.mealDate) },
              {
                label: "Window",
                value: `${fmtLocal(day.windowOpens)} – ${fmtLocal(day.windowCloses)}`,
              },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/mess/menu-management" variant="ghost">
              Menu management
            </InspectorButton>
            <InspectorButton href="/mess/scan" variant="primary">
              Token scanner
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/mess/menu-management",
    detailLabel: "Menu management",
  };
}

export interface MessInventoryItem {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isPrimary: boolean;
  scheduledDays: number;
}

export function stockItemInspection(i: MessInventoryItem): EntityInspection {
  return {
    kind: "stock_item",
    title: i.label,
    subtitle: i.code,
    status: (
      <StatusBadge
        text={i.isPrimary ? "PRIMARY" : "ADD-ON"}
        tone={i.isPrimary ? "warn" : "neutral"}
      />
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Item", value: i.label },
              { label: "Code", value: i.code },
              { label: "Role", value: i.isPrimary ? "Primary (meal selection)" : "Add-on" },
              {
                label: "Scheduled days",
                value: i.scheduledDays > 0 ? `${i.scheduledDays} day(s)` : "Not scheduled",
              },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <p className="text-xs text-text-muted">
            Stock state mirrors the active menu-item catalog. Stock
            shortfalls are flagged to the caretaker / facilities authority
            via operational requests.
          </p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/mess/inventory-stock" variant="ghost">
              All inventory
            </InspectorButton>
            <InspectorButton href="/mess/operational-requests" variant="primary">
              Raise operational request
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/mess/inventory-stock",
    detailLabel: "Inventory & stock",
  };
}

/* ── mess: meal day (consumption + attendance) ─────────────────────────── */

export interface MessConsumptionDay {
  messDayId: string;
  mealDate: string;
  mealType: string;
  isActive: boolean;
  servedTotal: number;
  viaToken: number;
  viaManual: number;
  veg: number;
  nonVeg: number;
  firstServedAt: string | null;
  lastServedAt: string | null;
}

export function mealDayInspection(d: MessConsumptionDay): EntityInspection {
  return {
    kind: "menu",
    title: `Meal day · ${fmtLocal(d.mealDate)}`,
    subtitle: d.mealType.toUpperCase(),
    status: <StatusBadge text={d.isActive ? "ACTIVE" : "CLOSED"} tone={d.isActive ? "ok" : "neutral"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Date", value: fmtLocal(d.mealDate) },
              { label: "Meal type", value: d.mealType },
              { label: "Served", value: String(d.servedTotal) },
              {
                label: "Method",
                value: `${d.viaToken} token · ${d.viaManual} manual`,
              },
              { label: "Veg / Non-veg", value: `${d.veg} / ${d.nonVeg}` },
              {
                label: "Window",
                value: `${fmtLocal(d.firstServedAt)} – ${fmtLocal(d.lastServedAt)}`,
              },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <p className="text-xs text-text-muted">
            Servings stream from the token scanner and manual
            confirmations. Per-student attendance is visible in the meal
            attendance view.
          </p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/mess/consumption-reports" variant="ghost">
              Consumption reports
            </InspectorButton>
            <InspectorButton href="/mess/meal-attendance" variant="primary">
              Meal attendance
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/mess/consumption-reports",
    detailLabel: "Consumption reports",
  };
}

/* ── mess: operational request ─────────────────────────────────────────── */

export interface MessOperationalRequest {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt: string | null;
  resolvedAt?: string | null;
}

export function operationalRequestInspection(r: MessOperationalRequest): EntityInspection {
  const open = r.status === "OPEN";
  return {
    kind: "incident",
    title: r.title,
    subtitle: r.id,
    status: <StatusBadge text={r.status} tone={open ? "warn" : "ok"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Category", value: r.category },
              { label: "Priority", value: r.priority },
              { label: "Raised", value: fmtLocal(r.createdAt) },
              ...(r.resolvedAt ? [{ label: "Resolved", value: fmtLocal(r.resolvedAt) }] : []),
            ]}
          />
        ),
      },
      {
        title: "Details",
        collapsible: true,
        content: r.description ? (
          <p className="text-xs text-text-secondary">{r.description}</p>
        ) : (
          <p className="text-xs text-text-muted">No details provided.</p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/mess/operational-requests" variant="ghost">
              All requests
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/mess/operational-requests",
    detailLabel: "Operational requests",
  };
}

/* ── VP: academic department + exception ───────────────────────────────── */

export interface VPDepartmentRow {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}

export function academicDepartmentInspection(
  d: VPDepartmentRow,
  opts?: { exceptions?: { absent: number; late: number; flagged: number } },
): EntityInspection {
  const tone: "ok" | "warn" | "danger" =
    d.attendancePct >= 85 ? "ok" : d.attendancePct >= 70 ? "warn" : "danger";
  const exceptions = opts?.exceptions;
  return {
    kind: "academic_record",
    title: d.name,
    subtitle: d.code,
    status: <StatusBadge text={`${d.attendancePct}% attendance`} tone={tone} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Department", value: d.name },
              { label: "HOD", value: d.hodName ?? "—" },
              { label: "Students", value: String(d.students) },
              { label: "Faculty", value: String(d.faculty) },
              { label: "Ratio", value: `1:${d.ratio}` },
            ]}
          />
        ),
      },
      {
        title: "Exceptions",
        collapsible: true,
        content: exceptions ? (
          <KVPairs
            items={[
              { label: "Absent today", value: String(exceptions.absent) },
              { label: "Late today", value: String(exceptions.late) },
              { label: "Flagged", value: String(exceptions.flagged) },
            ]}
          />
        ) : (
          <p className="text-xs text-text-muted">Exception detail loads in the exceptions view.</p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/vice-principal/academics/departments" variant="ghost">
              All departments
            </InspectorButton>
            <InspectorButton href="/vice-principal/academics/exceptions" variant="primary">
              Attendance exceptions
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/vice-principal/academics/exceptions",
    detailLabel: "Attendance exceptions",
  };
}

export interface VPExceptionPerson {
  id: string;
  name: string;
  role?: string | null;
  designation?: string | null;
  department?: string | null;
  reason?: string | null;
  minutesLate?: number;
}

export function vpExceptionPersonInspection(
  p: VPExceptionPerson,
  kind: "absent" | "late" | "flagged",
): EntityInspection {
  const tone = kind === "absent" ? "danger" : kind === "late" ? "warn" : "neutral";
  return {
    kind: "academic_record",
    title: p.name,
    subtitle: (p.department ?? p.role ?? p.designation ?? "").toString() || null,
    status: <StatusBadge text={kind.toUpperCase()} tone={tone} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Name", value: p.name },
              { label: "Department", value: p.department ?? "—" },
              { label: "Designation", value: p.designation ?? p.role ?? "—" },
              ...(p.reason ? [{ label: "Reason", value: p.reason }] : []),
              ...(p.minutesLate != null
                ? [{ label: "Minutes late", value: `${p.minutesLate}m` }]
                : []),
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/vice-principal/academics/exceptions" variant="ghost">
              All exceptions
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/vice-principal/academics/exceptions",
    detailLabel: "Attendance exceptions",
  };
}

/* ── delegation (status + scope) ───────────────────────────────────── */

export interface DelegationStatus {
  active: boolean;
  scopes: string[];
  delegatedBy?: string;
  note?: string;
}

export function delegationStatusInspection(
  d: DelegationStatus,
): EntityInspection {
  const active = d.active;
  return {
    kind: "delegation",
    title: active ? "Delegation active" : "No delegation recorded",
    subtitle: active ? `${d.scopes.length} scope(s)` : null,
    status: <StatusBadge text={active ? "ACTIVE" : "INACTIVE"} tone={active ? "ok" : "neutral"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "State", value: active ? "Active" : "Not recorded" },
              {
                label: "Scopes",
                value: d.scopes.length > 0 ? d.scopes.join(", ") : "—",
              },
              { label: "Delegated by", value: d.delegatedBy ?? "—" },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <p className="text-xs text-text-muted">
            {d.note ??
              "Delegation data is read from the principal/warden policy ledger. Without a recorded delegation, the deputy warden's review actions are read-only and items escalate to the warden stage."}
          </p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/deputy-warden" variant="ghost">
              Outpass queue
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/deputy-warden/delegated-approvals",
    detailLabel: "Delegated approvals",
  };
}

/* ── VP: escalation + decision rows ────────────────────────────────────── */

export interface VPPermissionRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  student?: {
    name?: string;
    student_details?: { roll?: string } | null;
  } | null;
}

export function escalationInspection(r: VPPermissionRow): EntityInspection {
  const breached =
    r.sla_deadline != null && new Date(r.sla_deadline).getTime() < Date.now();
  return {
    kind: "escalation",
    title: `${r.student?.name ?? "Unknown"} · ${r.ticket_number}`,
    subtitle: `${String(r.workflow_type).replace(/_/g, " ")} · escalated → ${r.current_stage}`,
    status: (
      <StatusBadge
        text={breached ? "SLA BREACHED" : r.status}
        tone={breached ? "danger" : "warn"}
      />
    ),
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Ticket", value: r.ticket_number },
              { label: "Student", value: r.student?.name ?? "—" },
              {
                label: "Roll",
                value: r.student?.student_details?.roll ?? "—",
              },
              { label: "Created", value: fmtLocal(r.created_at ?? null) },
              {
                label: "SLA",
                value: r.sla_deadline
                  ? breached
                    ? `Breached · ${fmtLocal(r.sla_deadline)}`
                    : fmtLocal(r.sla_deadline)
                  : "—",
              },
            ]}
          />
        ),
      },
      {
        title: "Context",
        content: (
          <p className="text-xs text-text-muted">
            This request was escalated for senior review. The full
            request timeline is available in the pending-approvals queue.
          </p>
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/vice-principal/pending-approvals" variant="primary">
              Open in pending approvals
            </InspectorButton>
            <InspectorButton href="/vice-principal/escalated-requests" variant="ghost">
              Escalation queue
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/vice-principal/pending-approvals",
    detailLabel: "Pending approvals",
  };
}

export function decisionRecordInspection(r: VPPermissionRow): EntityInspection {
  const approved = r.status === "APPROVED" || r.status === "COMPLETED";
  return {
    kind: "decision",
    title: `${r.student?.name ?? "Unknown"} · ${r.ticket_number}`,
    subtitle: String(r.workflow_type).replace(/_/g, " "),
    status: <StatusBadge text={r.status} tone={approved ? "ok" : "danger"} />,
    sections: [
      {
        title: "Overview",
        content: (
          <KVPairs
            items={[
              { label: "Ticket", value: r.ticket_number },
              { label: "Student", value: r.student?.name ?? "—" },
              {
                label: "Roll",
                value: r.student?.student_details?.roll ?? "—",
              },
              { label: "Outcome", value: r.status },
              { label: "Decided", value: fmtLocal(r.updated_at ?? r.created_at ?? null) },
            ]}
          />
        ),
      },
      {
        title: "Actions",
        content: (
          <ActionRow>
            <InspectorButton href="/vice-principal/decision-history" variant="ghost">
              All decisions
            </InspectorButton>
          </ActionRow>
        ),
      },
    ],
    detailHref: "/vice-principal/decision-history",
    detailLabel: "Decision history",
  };
}
