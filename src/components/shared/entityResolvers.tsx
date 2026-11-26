"use client";

/**
 * entityResolvers — central registry mapping entity kind → async loader.
 *
 * Every resolver returns an `EntityInspection` model (the shared contract).
 * Resolvers fetch from the *existing* API routes via `cachedFetch`
 * (the same fetcher the `useApiResource` hook uses) so that:
 *
 *   - Auth headers are attached (401 → single-flight refresh → retry).
 *   - The in-memory cache is shared with the dashboard's own polling.
 *   - No duplicate fetch logic is introduced.
 *
 * Usage (from a page or component):
 *
 *   import { resolveEntity } from "@/components/shared/entityResolvers";
 *
 *   const inspection = await resolveEntity("gate", "g-1");
 *   inspect(inspection); // pass to useEntityInspector
 *
 * The registry is intentionally small and extensible: add a new kind by
 * appending an entry to `REGISTRY`. Each loader builds the full
 * `EntityInspection` (sections, status, detailHref) so the shared
 * `EntityInspector` renders it without any entity-specific code.
 */

import { useCallback, useEffect, useState } from "react";
import { cachedFetch } from "@/hooks/useApiResource";
import {
  ticketRowInspection,
  hostelBlockInspection,
  gatePresenceInspection,
  incidentInspection,
  shiftHandoverInspection,
  menuInspection,
  stockItemInspection,
  mealDayInspection,
  operationalRequestInspection,
  academicDepartmentInspection,
  vpExceptionPersonInspection,
  delegationStatusInspection,
  escalationInspection,
  decisionRecordInspection,
  type HMBoardRow,
  type HostelBlockOccupancy,
  type GatePresenceRow,
  type IncidentRow,
  type HandoverRecord,
  type MessMenuItem,
  type MenuDayInfo,
  type MessInventoryItem,
  type MessConsumptionDay,
  type MessOperationalRequest,
  type VPDepartmentRow,
  type VPExceptionPerson,
  type DelegationStatus,
  type VPPermissionRow,
} from "@/components/approver/wardenConsoleModels";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import {
  KVPairs,
  Timeline,
  ActionRow,
  InspectorButton,
  type EntityInspection,
  type InspectionSection,
} from "@/components/shared/EntityInspector";

/* ── data shapes (minimal — just what each resolver reads) ───────────────── */

interface GateRow {
  id: string;
  gate_code: string;
  name: string;
  location?: string;
  type?: string;
  audience?: string;
  is_active: boolean;
}

interface DepartmentRow {
  code: string;
  name: string;
  hod: string;
  totalStudents: number;
  facultyCount: number;
}

interface CaseEvent {
  event: string;
  detail: Record<string, unknown>;
  created_at: string;
}

interface CaseDetail {
  id: string;
  ref: string;
  type: string;
  state: string;
  risk: string;
  authority_role: string | null;
  entity_scope: string | null;
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  events: CaseEvent[];
}

interface PermissionStageLog {
  actorName: string;
  actorRole: string;
  action: string;
  comment?: string | null;
  timestamp: string;
}

interface PermissionTicket {
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  reason?: string | null;
  student?: { name?: string; student_details?: { roll?: string } };
  created_at: string;
  updated_at: string;
  stage_history?: PermissionStageLog[];
}

interface AlertRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  source?: string;
  created_at: string;
}

/* ── fetch helpers (reuse cachedFetch, not raw fetch) ────────────────────── */

async function fetchGateById(gateId: string): Promise<GateRow> {
  const res = await cachedFetch<{ success: boolean; data?: GateRow }>(
    `/api/admin/gates/${encodeURIComponent(gateId)}`,
    { ttlMs: 10_000 },
  );
  if (!res.data) throw new Error(`Gate ${gateId} not found`);
  return res.data;
}

async function fetchDepartmentByCode(deptCode: string): Promise<DepartmentRow> {
  const res = await cachedFetch<{ success: boolean; data?: DepartmentRow[] }>(
    "/api/departments",
    { ttlMs: 30_000 },
  );
  const found = res.data?.find((d) => d.code === deptCode);
  if (!found) throw new Error(`Department ${deptCode} not found`);
  return found;
}

async function fetchCaseById(caseId: string): Promise<CaseDetail> {
  // /api/cases/:id returns ok({ case: CaseRow & { events } })
  const res = await cachedFetch<{ success: boolean; case?: CaseDetail }>(
    `/api/cases/${encodeURIComponent(caseId)}`,
    { ttlMs: 15_000 },
  );
  if (!res.case) throw new Error(`Case ${caseId} not found`);
  return res.case;
}

async function fetchPermissionByTicket(ticket: string): Promise<PermissionTicket> {
  const res = await cachedFetch<{ success: boolean; data?: PermissionTicket }>(
    `/api/permissions/${encodeURIComponent(ticket)}`,
    { ttlMs: 15_000 },
  );
  if (!res.data) throw new Error(`Permission ticket ${ticket} not found`);
  return res.data;
}

async function fetchAlertById(alertId: string): Promise<AlertRow> {
  // The /api/alerts route returns a list; we filter client-side.
  const res = await cachedFetch<{ success: boolean; data?: AlertRow[] }>(
    "/api/alerts",
    { ttlMs: 15_000 },
  );
  const found = res.data?.find((a) => a.id === alertId);
  if (!found) throw new Error(`Alert ${alertId} not found`);
  return found;
}

/* ── section builders (reuse the shared KVPairs / Timeline / ActionRow) ─── */

function overviewSection(items: Array<{ label: string; value: React.ReactNode }>): InspectionSection {
  return {
    title: "Overview",
    content: <KVPairs items={items} />,
  };
}

function timelineSection(
  items: Array<{ label: string; time?: string; detail?: string; tone?: "ok" | "warn" | "danger" | "neutral" }>,
): InspectionSection {
  return {
    title: "Timeline",
    collapsible: true,
    content: <Timeline items={items} />,
  };
}

function actionsSection(
  actions: Array<{ label: string; href?: string; variant?: "primary" | "ghost" | "danger" }>,
): InspectionSection {
  return {
    title: "Actions",
    content: (
      <ActionRow>
        {actions.map((a, i) => (
          <InspectorButton key={i} href={a.href} variant={a.variant ?? "primary"}>
            {a.label}
          </InspectorButton>
        ))}
      </ActionRow>
    ),
  };
}

/* Inline status badge helper (kept here so resolvers don't need a Badge import). */
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

/* ── resolver interface + registry ──────────────────────────────────────── */

export interface EntityResolver {
  /** Human-readable entity kind name. */
  kind: string;
  /**
   * Async loader: fetches the entity from the existing API routes and builds
   * the full EntityInspection model.
   * @param id  The entity's primary key (gate code, dept code, case uuid, ticket no, alert id).
   * @param context  Optional extras (caller's role, feature flags, etc.).
   */
  resolve: (id: string, context?: Record<string, unknown>) => Promise<EntityInspection>;
}

const REGISTRY = new Map<string, EntityResolver>();

function register(resolver: EntityResolver): void {
  REGISTRY.set(resolver.kind, resolver);
}

/* Gate — /api/admin/gates/:id */
register({
  kind: "gate",
  async resolve(id) {
    const gate = await fetchGateById(id);
    const active = gate.is_active;
    return {
      kind: "gate",
      title: gate.name || gate.gate_code,
      subtitle: gate.gate_code,
      status: <StatusBadge text={active ? "ACTIVE" : "INACTIVE"} tone={active ? "ok" : "neutral"} />,
      sections: [
        overviewSection([
          { label: "Code", value: <code className="font-mono">{gate.gate_code}</code> },
          { label: "Location", value: gate.location ?? "—" },
          { label: "Type", value: gate.type ?? "—" },
          { label: "Audience", value: gate.audience ?? "all" },
        ]),
        actionsSection([
          { label: "View Telemetry", href: `/admin/gates/${gate.id}` },
        ]),
      ],
      detailHref: `/admin/gates/${gate.id}`,
      detailLabel: "Full gate detail",
    };
  },
});

/* Department — /api/departments */
register({
  kind: "department",
  async resolve(id) {
    const dept = await fetchDepartmentByCode(id);
    return {
      kind: "department",
      title: dept.name,
      subtitle: dept.code,
      status: <StatusBadge text="ACTIVE" tone="ok" />,
      sections: [
        overviewSection([
          { label: "HOD", value: dept.hod },
          { label: "Total Students", value: String(dept.totalStudents) },
          { label: "Faculty Count", value: String(dept.facultyCount) },
        ]),
        actionsSection([
          { label: "Manage Department", href: "/admin/departments" },
        ]),
      ],
      detailHref: "/admin/departments",
      detailLabel: "All departments",
    };
  },
});

/* Case — /api/cases/:id */
register({
  kind: "case",
  async resolve(id) {
    const c = await fetchCaseById(id);
    const stateTone: "ok" | "warn" | "danger" | "neutral" =
      c.state === "RESOLVED" || c.state === "CLOSED" ? "ok"
      : c.state === "OPEN" ? "warn"
      : "neutral";

    const eventItems = c.events.map((e) => ({
      label: e.event,
      time: e.created_at,
      detail: e.detail
        ? Object.entries(e.detail).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")
        : undefined,
      tone: "neutral" as const,
    }));

    return {
      kind: "case",
      title: c.ref,
      subtitle: `Type: ${c.type}`,
      status: <StatusBadge text={c.state} tone={stateTone} />,
      sections: [
        overviewSection([
          { label: "Risk", value: c.risk.toUpperCase() },
          { label: "Authority Role", value: c.authority_role ?? "—" },
          { label: "Entity Scope", value: c.entity_scope ?? "—" },
          { label: "SLA Due", value: c.sla_due_at ? new Date(c.sla_due_at).toLocaleString() : "—" },
        ]),
        timelineSection(eventItems),
        actionsSection([
          { label: "All Cases", href: "/admin/cases" },
        ]),
      ],
      detailHref: "/admin/cases",
      detailLabel: "All cases",
    };
  },
});

/* Permission — /api/permissions/:ticket */
register({
  kind: "permission",
  async resolve(id) {
    const p = await fetchPermissionByTicket(id);
    const statusTone: "ok" | "warn" | "danger" | "neutral" =
      p.status === "APPROVED" ? "ok"
      : p.status === "REJECTED" ? "danger"
      : p.status === "PENDING" ? "warn"
      : "neutral";

    const historyItems = (p.stage_history ?? []).map((h) => ({
      label: `${h.actorName} ${h.action.toLowerCase()}`,
      time: h.timestamp,
      detail: h.comment ?? undefined,
      tone: h.action === "FORWARDED" ? ("warn" as const) : ("neutral" as const),
    }));

    const sections: InspectionSection[] = [
      overviewSection([
        { label: "Student", value: p.student?.name ?? "—" },
        { label: "Roll", value: p.student?.student_details?.roll ?? "—" },
        { label: "Reason", value: p.reason ?? "—" },
        { label: "Created", value: p.created_at ? new Date(p.created_at).toLocaleString() : "—" },
      ]),
    ];
    if (historyItems.length > 0) sections.push(timelineSection(historyItems));
    sections.push(actionsSection([{ label: "Open in Approvals", href: "/principal" }]));

    return {
      kind: "permission",
      title: p.ticket_number,
      subtitle: `${p.workflow_type} · stage ${p.current_stage}`,
      status: <StatusBadge text={p.status} tone={statusTone} />,
      sections,
      detailHref: "/principal",
      detailLabel: "Approvals view",
    };
  },
});

/* Alert — /api/alerts (list, filter by id) */
register({
  kind: "alert",
  async resolve(id) {
    const alert = await fetchAlertById(id);
    const sevTone: "ok" | "warn" | "danger" | "neutral" =
      alert.severity === "critical" || alert.severity === "high" ? "danger"
      : alert.severity === "medium" || alert.severity === "warning" ? "warn"
      : "neutral";
    return {
      kind: "alert",
      title: alert.title,
      subtitle: alert.id,
      status: <StatusBadge text={alert.severity.toUpperCase()} tone={sevTone} />,
      sections: [
        overviewSection([
          { label: "Status", value: alert.status.toUpperCase() },
          { label: "Source", value: alert.source ?? "—" },
          { label: "Created", value: new Date(alert.created_at).toLocaleString() },
        ]),
        actionsSection([
          { label: "View Alerts", href: "/admin/alerts", variant: "ghost" },
        ]),
      ],
      detailHref: "/admin/alerts",
      detailLabel: "All alerts",
    };
  },
});

/* ── wave-1 entity kinds (PR-05F-2) ─────────────────────────────────────── */
/*
 * Each resolver below is wired to a real, existing API route that has a
 * working GET. Kinds that have NO single-record GET route are documented
 * here and left unregistered (EntityReference renders them as static
 * chips by design — see the coordinator's PR-05F-2 note). All loaders
 * reuse cachedFetch so the dashboard's shared cache is honoured.
 *
 * Wave-1 kinds with NO real GET route (left as static chips on purpose):
 *   - operational_request — no /api/operational-requests GET exists; the
 *     operational task model has no dedicated single-record endpoint.
 *   - sla_cell — SLA state is a computed aggregate over cases (see
 *     /api/cases), not a standalone record; no /api/sla-cell GET route.
 */

/* hostel_block — /api/hostel/blocks (occupancy summary per block) */
interface HostelBlockRow {
  block: string;
  total: number;
  occupied: number;
}
async function fetchHostelBlock(block: string): Promise<HostelBlockRow> {
  const res = await cachedFetch<{ success: boolean; blocks?: HostelBlockRow[] }>(
    "/api/hostel/blocks",
    { ttlMs: 30_000 },
  );
  const found = res.blocks?.find((b) => b.block === block);
  if (!found) throw new Error(`Hostel block ${block} not found`);
  return found;
}
register({
  kind: "hostel_block",
  async resolve(id) {
    const b = await fetchHostelBlock(id);
    const occupancyPct = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
    const tone: "ok" | "warn" | "danger" | "neutral" =
      occupancyPct >= 90 ? "danger" : occupancyPct >= 70 ? "warn" : "ok";
    return {
      kind: "hostel_block",
      title: `Block ${b.block}`,
      subtitle: `Total ${b.total} · Occupied ${b.occupied}`,
      status: <StatusBadge text={`${occupancyPct}%`} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Total beds", value: String(b.total) },
          { label: "Occupied", value: String(b.occupied) },
          { label: "Free", value: String(Math.max(0, b.total - b.occupied)) },
          { label: "Occupancy", value: `${occupancyPct}%` },
        ]),
        actionsSection([
          { label: "Block occupants", href: "/hostel-manager", variant: "ghost" },
        ]),
      ],
      detailHref: "/admin/departments",
      detailLabel: "Hostel overview",
    };
  },
});

/* menu — /api/mess/days (today's menu). "menu" kind maps to the current
   mess day's scheduled items. */
interface MessDayRow {
  id: string;
  mealDate: string;
  mealType: string;
  dayType: string;
  windowOpensAt: string;
  windowClosesAt: string;
  isActive: boolean;
  itemCount: number;
  selections: number;
}
async function fetchCurrentMenu(): Promise<MessDayRow> {
  const res = await cachedFetch<{ success: boolean; days?: MessDayRow[] }>(
    "/api/mess/days",
    { ttlMs: 15_000 },
  );
  const days = res.days ?? [];
  const active = days.find((d) => d.isActive);
  if (!active) throw new Error("No active mess day found");
  return active;
}
register({
  kind: "menu",
  async resolve() {
    const day = await fetchCurrentMenu();
    return {
      kind: "menu",
      title: `Menu · ${day.mealDate}`,
      subtitle: `${day.mealType} (${day.dayType})`,
      status: <StatusBadge text={day.isActive ? "ACTIVE" : "CLOSED"} tone={day.isActive ? "ok" : "neutral"} />,
      sections: [
        overviewSection([
          { label: "Meal", value: day.mealType },
          { label: "Day type", value: day.dayType },
          { label: "Window opens", value: day.windowOpensAt ? new Date(day.windowOpensAt).toLocaleString() : "—" },
          { label: "Window closes", value: day.windowClosesAt ? new Date(day.windowClosesAt).toLocaleString() : "—" },
          { label: "Items scheduled", value: String(day.itemCount) },
          { label: "Selections", value: String(day.selections) },
        ]),
        actionsSection([
          { label: "Mess days", href: "/mess", variant: "ghost" },
        ]),
      ],
      detailHref: "/mess",
      detailLabel: "Mess panel",
    };
  },
});

/* stock_item — /api/mess/inventory (catalog stock state per menu item). */
interface StockItemRow {
  id: string;
  code: string;
  label: string;
  isPrimary: boolean;
  scheduledDays: number;
}
async function fetchStockItem(id: string): Promise<StockItemRow> {
  const res = await cachedFetch<{ success: boolean; items?: StockItemRow[] }>(
    "/api/mess/inventory",
    { ttlMs: 15_000 },
  );
  const found = res.items?.find((i) => i.id === id || i.code === id);
  if (!found) throw new Error(`Stock item ${id} not found`);
  return found;
}
register({
  kind: "stock_item",
  async resolve(id) {
    const s = await fetchStockItem(id);
    const tone: "ok" | "warn" | "neutral" = s.scheduledDays > 0 ? "ok" : "warn";
    return {
      kind: "stock_item",
      title: s.label,
      subtitle: s.code,
      status: <StatusBadge text={`${s.scheduledDays} days`} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Code", value: <code className="font-mono">{s.code}</code> },
          { label: "Primary", value: s.isPrimary ? "Yes" : "No" },
          { label: "Scheduled on", value: `${s.scheduledDays} mess days` },
        ]),
        actionsSection([
          { label: "Full inventory", href: "/mess", variant: "ghost" },
        ]),
      ],
      detailHref: "/mess",
      detailLabel: "Mess inventory",
    };
  },
});

/* meal_day — /api/mess/days (a specific meal day by id). */
async function fetchMealDay(id: string): Promise<MessDayRow> {
  const res = await cachedFetch<{ success: boolean; days?: MessDayRow[] }>(
    "/api/mess/days",
    { ttlMs: 15_000 },
  );
  const found = res.days?.find((d) => d.id === id);
  if (!found) throw new Error(`Meal day ${id} not found`);
  return found;
}
register({
  kind: "meal_day",
  async resolve(id) {
    const d = await fetchMealDay(id);
    return {
      kind: "meal_day",
      title: `${d.mealType} · ${d.mealDate}`,
      subtitle: `Day ${d.dayType}`,
      status: <StatusBadge text={d.isActive ? "ACTIVE" : "CLOSED"} tone={d.isActive ? "ok" : "neutral"} />,
      sections: [
        overviewSection([
          { label: "Window opens", value: d.windowOpensAt ? new Date(d.windowOpensAt).toLocaleString() : "—" },
          { label: "Window closes", value: d.windowClosesAt ? new Date(d.windowClosesAt).toLocaleString() : "—" },
          { label: "Items scheduled", value: String(d.itemCount) },
          { label: "Selections", value: String(d.selections) },
        ]),
        actionsSection([
          { label: "All mess days", href: "/mess", variant: "ghost" },
        ]),
      ],
      detailHref: "/mess",
      detailLabel: "Mess panel",
    };
  },
});

/* shift_handover — /api/campus-extra/handover (list; filter by to_role). */
interface HandoverRow {
  id: string;
  fromRole: string;
  toRole: string;
  createdAt: string;
  notes: string;
}
async function fetchShiftHandover(toRole: string): Promise<HandoverRow[]> {
  const res = await cachedFetch<{ success: boolean; data?: { handovers: HandoverRow[] } }>(
    `/api/campus-extra/handover?to_role=${encodeURIComponent(toRole)}`,
    { ttlMs: 15_000 },
  );
  return res.data?.handovers ?? [];
}
register({
  kind: "shift_handover",
  async resolve(id) {
    const handovers = await fetchShiftHandover(id);
    const latest = handovers[0];
    if (!latest) {
      return {
        kind: "shift_handover",
        title: `Handover to ${id}`,
        subtitle: `${handovers.length} on record`,
        status: <StatusBadge text="EMPTY" tone="neutral" />,
        sections: [
          { title: "Overview", content: <p className="text-xs text-text-muted">No related records</p> },
          actionsSection([{ label: "Shift handover", href: "/supervisor", variant: "ghost" }]),
        ],
      };
    }
    return {
      kind: "shift_handover",
      title: `Handover · ${latest.fromRole} → ${latest.toRole}`,
      subtitle: latest.id,
      status: <StatusBadge text="ACTIVE" tone="ok" />,
      sections: [
        overviewSection([
          { label: "From role", value: latest.fromRole },
          { label: "To role", value: latest.toRole },
          { label: "Created", value: new Date(latest.createdAt).toLocaleString() },
          { label: "Notes", value: latest.notes || "—" },
        ]),
        actionsSection([
          { label: "All handovers", href: "/supervisor", variant: "ghost" },
        ]),
      ],
      detailHref: "/supervisor",
      detailLabel: "Supervisor console",
    };
  },
});

/* escalation — /api/principal/escalations (list open; filter by case id). */
interface EscalationRow {
  id: string;
  case_id: string;
  reason: string;
  severity: string;
  source: string | null;
  target_role: string | null;
  status: string;
  recommended_action: string | null;
  created_at: string;
}
async function fetchEscalation(id: string): Promise<EscalationRow> {
  const res = await cachedFetch<{ success: boolean; escalations?: EscalationRow[] }>(
    "/api/principal/escalations",
    { ttlMs: 15_000 },
  );
  const found = res.escalations?.find((e) => e.id === id || e.case_id === id);
  if (!found) throw new Error(`Escalation ${id} not found`);
  return found;
}
register({
  kind: "escalation",
  async resolve(id) {
    const e = await fetchEscalation(id);
    const tone: "ok" | "warn" | "danger" | "neutral" =
      e.severity === "critical" ? "danger" : e.severity === "high" ? "warn" : "neutral";
    return {
      kind: "escalation",
      title: e.reason,
      subtitle: `Case ${e.case_id}`,
      status: <StatusBadge text={e.severity.toUpperCase()} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Target role", value: e.target_role ?? "—" },
          { label: "Source", value: e.source ?? "—" },
          { label: "Recommended", value: e.recommended_action ?? "—" },
          { label: "Status", value: e.status.toUpperCase() },
          { label: "Created", value: new Date(e.created_at).toLocaleString() },
        ]),
        actionsSection([
          { label: "All escalations", href: "/principal/escalations", variant: "ghost" },
        ]),
      ],
      detailHref: "/principal/escalations",
      detailLabel: "All escalations",
    };
  },
});

/* delegation_status — /api/principal/delegations (list active; by id). */
interface DelegationRow {
  id: string;
  delegate_role: string;
  scope: string | null;
  status: string;
  created_by: string;
  created_at: string;
}
async function fetchDelegation(id: string): Promise<DelegationRow> {
  const res = await cachedFetch<{ success: boolean; delegations?: DelegationRow[] }>(
    "/api/principal/delegations?status=ACTIVE",
    { ttlMs: 15_000 },
  );
  const found = res.delegations?.find((d) => d.id === id);
  if (!found) throw new Error(`Delegation ${id} not found`);
  return found;
}
register({
  kind: "delegation_status",
  async resolve(id) {
    const d = await fetchDelegation(id);
    return {
      kind: "delegation_status",
      title: `Delegated to ${d.delegate_role}`,
      subtitle: d.id,
      status: <StatusBadge text={d.status.toUpperCase()} tone={d.status === "ACTIVE" ? "ok" : "neutral"} />,
      sections: [
        overviewSection([
          { label: "Delegate role", value: d.delegate_role },
          { label: "Scope", value: d.scope ?? "—" },
          { label: "Status", value: d.status.toUpperCase() },
          { label: "Created", value: new Date(d.created_at).toLocaleString() },
        ]),
        actionsSection([
          { label: "All delegations", href: "/principal/governance/delegations", variant: "ghost" },
        ]),
      ],
      detailHref: "/principal/governance/delegations",
      detailLabel: "All delegations",
    };
  },
});

/* academic_department — /api/approver/academics-department (GET full payload). */
register({
  kind: "academic_department",
  async resolve() {
    const res = await cachedFetch<{ success: boolean; data?: unknown }>(
      "/api/approver/academics-department",
      { ttlMs: 30_000 },
    );
    // The payload is a wide join (departments + faculty + students + movement).
    // We only expose it as context here; the deepest layer is the panel page.
    return {
      kind: "academic_department",
      title: "Academics & Departments",
      subtitle: "Live join view",
      status: <StatusBadge text="LIVE" tone="ok" />,
      sections: [
        { title: "Overview", content: <p className="text-xs text-text-muted">Live academic and departmental join. See the panel for the full breakdown.</p> },
        actionsSection([
          { label: "Academics panel", href: "/principal/people/departments", variant: "primary" },
        ]),
      ],
      detailHref: "/principal/people/departments",
      detailLabel: "Academics panel",
    };
  },
});

/* request — /api/class-requests (GET; student own queue or class queue). */
interface ClassRequestRow {
  id: string;
  category_code: string;
  title: string;
  status: string;
  created_at: string;
}
async function fetchClassRequest(id: string): Promise<ClassRequestRow> {
  const res = await cachedFetch<unknown>(
    "/api/class-requests?status=open",
    { ttlMs: 15_000 },
  );
  // The list endpoint returns an array of ClassRequestRow (or an object
  // with .collectiveRequests / .levelIssues). We try both shapes.
  const list = Array.isArray(res) ? res : (res as { collectiveRequests?: ClassRequestRow[] })?.collectiveRequests ?? [];
  const found = list.find((r) => r.id === id);
  if (!found) throw new Error(`Class request ${id} not found`);
  return found;
}
register({
  kind: "request",
  async resolve(id) {
    const r = await fetchClassRequest(id);
    const tone: "ok" | "warn" | "neutral" =
      r.status === "open" ? "warn" : r.status === "resolved" ? "ok" : "neutral";
    return {
      kind: "request",
      title: r.title,
      subtitle: r.category_code,
      status: <StatusBadge text={r.status.toUpperCase()} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Category", value: r.category_code },
          { label: "Status", value: r.status.toUpperCase() },
          { label: "Created", value: new Date(r.created_at).toLocaleString() },
        ]),
        actionsSection([
          { label: "All requests", href: "/faculty/class-requests", variant: "ghost" },
        ]),
      ],
      detailHref: "/faculty/class-requests",
      detailLabel: "All class requests",
    };
  },
});

/* asset — /api/gate/devices (gate device health; filter by gate id). */
interface GateDeviceRow {
  id: string;
  name: string;
  location: string;
  gateCode: string;
  status: "online" | "offline" | "maintenance";
  isOnline: boolean;
  entriesToday: number;
  exitsToday: number;
  lastActive: string;
  uptime: number;
}
async function fetchGateDevice(id: string): Promise<GateDeviceRow> {
  const res = await cachedFetch<{ success: boolean; devices?: GateDeviceRow[] }>(
    "/api/gate/devices",
    { ttlMs: 15_000 },
  );
  const found = res.devices?.find((d) => d.id === id);
  if (!found) throw new Error(`Gate device ${id} not found`);
  return found;
}
register({
  kind: "asset",
  async resolve(id) {
    const a = await fetchGateDevice(id);
    const tone: "ok" | "warn" | "danger" | "neutral" =
      a.status === "online" ? "ok" : a.status === "maintenance" ? "warn" : "danger";
    return {
      kind: "asset",
      title: a.name,
      subtitle: a.gateCode,
      status: <StatusBadge text={a.status.toUpperCase()} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Location", value: a.location },
          { label: "Entries today", value: String(a.entriesToday) },
          { label: "Exits today", value: String(a.exitsToday) },
          { label: "Last active", value: a.lastActive },
          { label: "Uptime", value: `${a.uptime}%` },
        ]),
        actionsSection([
          { label: "All devices", href: "/admin/gates", variant: "ghost" },
        ]),
      ],
      detailHref: `/admin/gates/${a.id}`,
      detailLabel: "Full gate detail",
    };
  },
});

/* person_exception — /api/admin/exceptions (today's gate exceptions; filter by gate). */
interface GateExceptionRow {
  gate_id: string;
  unique_id: string;
  name: string;
  scan_type: string;
  is_correction: boolean;
  reason: string | null;
  timestamp: string;
}
async function fetchGateExceptionPerson(id: string): Promise<GateExceptionRow> {
  const res = await cachedFetch<{ success: boolean; data?: { transactions: GateExceptionRow[] } }>(
    "/api/admin/exceptions",
    { ttlMs: 15_000 },
  );
  const list = res.data?.transactions ?? [];
  const found = list.find((t) => t.unique_id === id || t.gate_id === id);
  if (!found) throw new Error(`Gate exception ${id} not found`);
  return found;
}
register({
  kind: "person_exception",
  async resolve(id) {
    const x = await fetchGateExceptionPerson(id);
    return {
      kind: "person_exception",
      title: x.name || x.unique_id,
      subtitle: x.unique_id,
      status: <StatusBadge text={(x.reason ?? "exception").toUpperCase()} tone="danger" />,
      sections: [
        overviewSection([
          { label: "Gate", value: x.gate_id },
          { label: "Scan type", value: x.scan_type },
          { label: "Correction", value: x.is_correction ? "Yes" : "No" },
          { label: "Reason", value: x.reason ?? "—" },
          { label: "Timestamp", value: new Date(x.timestamp).toLocaleString() },
        ]),
        actionsSection([
          { label: "All exceptions", href: "/admin/exceptions", variant: "ghost" },
        ]),
      ],
      detailHref: "/admin/exceptions",
      detailLabel: "All exceptions",
    };
  },
});

/* notification — /api/notifications (list; by id). */
interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  type: string;
  created_at: string;
  read_at: string | null;
}
async function fetchNotification(id: string): Promise<NotificationRow> {
  const res = await cachedFetch<{ success: boolean; data?: NotificationRow[] }>(
    "/api/notifications",
    { ttlMs: 15_000 },
  );
  const found = res.data?.find((n) => n.id === id);
  if (!found) throw new Error(`Notification ${id} not found`);
  return found;
}
register({
  kind: "notification",
  async resolve(id) {
    const n = await fetchNotification(id);
    return {
      kind: "notification",
      title: n.title,
      subtitle: n.type,
      status: <StatusBadge text={n.read_at ? "READ" : "UNREAD"} tone={n.read_at ? "neutral" : "warn"} />,
      sections: [
        overviewSection([
          { label: "Type", value: n.type },
          { label: "Body", value: n.body ?? "—" },
          { label: "Created", value: new Date(n.created_at).toLocaleString() },
          { label: "Read", value: n.read_at ? new Date(n.read_at).toLocaleString() : "—" },
        ]),
      ],
    };
  },
});

/* emergency — /api/emergency/alerts (list open; by id). */
interface EmergencyAlertRow {
  id: string;
  studentId: string;
  name: string;
  uniqueId: string;
  alertType: string;
  location: string;
  message: string | null;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
async function fetchEmergency(id: string): Promise<EmergencyAlertRow> {
  const res = await cachedFetch<{ success: boolean; alerts?: EmergencyAlertRow[] }>(
    "/api/emergency/alerts",
    { ttlMs: 15_000 },
  );
  const found = res.alerts?.find((a) => a.id === id);
  if (!found) throw new Error(`Emergency alert ${id} not found`);
  return found;
}
register({
  kind: "emergency",
  async resolve(id) {
    const e = await fetchEmergency(id);
    const tone: "ok" | "warn" | "danger" | "neutral" =
      e.resolvedAt ? "ok" : e.alertType === "emerg" ? "danger" : "warn";
    return {
      kind: "emergency",
      title: `${e.alertType} · ${e.name}`,
      subtitle: e.uniqueId,
      status: <StatusBadge text={e.resolvedAt ? "RESOLVED" : "OPEN"} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Location", value: e.location },
          { label: "Message", value: e.message ?? "—" },
          { label: "Acknowledged by", value: e.acknowledgedBy ?? "—" },
          { label: "Created", value: new Date(e.createdAt).toLocaleString() },
        ]),
        actionsSection([
          { label: "All emergency alerts", href: "/admin/alerts", variant: "ghost" },
        ]),
      ],
      detailHref: "/admin/alerts",
      detailLabel: "All alerts",
    };
  },
});

/* generated_pass — /api/passes/[passId] (a specific pass credential). */
interface GeneratedPassRow {
  id: string;
  pass_code: string;
  status: string;
  workflow_type: string;
  from_date?: string | null;
  to_date?: string | null;
  student_name?: string;
  student_roll?: string;
  created_at: string;
}
async function fetchGeneratedPass(id: string): Promise<GeneratedPassRow> {
  const res = await cachedFetch<{ success: boolean; data?: GeneratedPassRow }>(
    `/api/passes/${encodeURIComponent(id)}`,
    { ttlMs: 15_000 },
  );
  if (!res.data) throw new Error(`Pass ${id} not found`);
  return res.data;
}
register({
  kind: "generated_pass",
  async resolve(id) {
    const p = await fetchGeneratedPass(id);
    const tone: "ok" | "warn" | "danger" | "neutral" =
      p.status === "ACTIVE" ? "ok" : p.status === "EXPIRED" ? "neutral" : "warn";
    return {
      kind: "generated_pass",
      title: p.pass_code || p.id,
      subtitle: `${p.workflow_type} · ${p.student_name ?? ""}`.trim(),
      status: <StatusBadge text={p.status} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Status", value: p.status },
          { label: "Workflow", value: p.workflow_type },
          { label: "From", value: p.from_date ? new Date(p.from_date).toLocaleString() : "—" },
          { label: "To", value: p.to_date ? new Date(p.to_date).toLocaleString() : "—" },
          { label: "Created", value: new Date(p.created_at).toLocaleString() },
        ]),
        actionsSection([
          { label: "All passes", href: "/admin/passes", variant: "ghost" },
        ]),
      ],
      detailHref: "/admin/passes",
      detailLabel: "All passes",
    };
  },
});

/* exam_hall — /api/exam/access (exam access queue; read-only OIE view). */
interface ExamAccessRow {
  ticket_number: string;
  workflow_type: string;
  student_name: string;
  student_roll: string;
  status: string;
  current_stage: string;
  hall?: string;
  created_at: string;
}
async function fetchExamHall(id: string): Promise<ExamAccessRow> {
  const res = await cachedFetch<{ success: boolean; data?: { authorised: ExamAccessRow[] } }>(
    "/api/exam/access",
    { ttlMs: 15_000 },
  );
  const list = res.data?.authorised ?? [];
  const found = list.find((r) => r.ticket_number === id || r.student_roll === id);
  if (!found) throw new Error(`Exam access ${id} not found`);
  return found;
}
register({
  kind: "exam_hall",
  async resolve(id) {
    const e = await fetchExamHall(id);
    const tone: "ok" | "warn" | "danger" | "neutral" =
      e.status === "APPROVED" ? "ok" : e.status === "ESCALATED" ? "danger" : "warn";
    return {
      kind: "exam_hall",
      title: `${e.student_name} · ${e.student_roll}`,
      subtitle: e.ticket_number,
      status: <StatusBadge text={e.status} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Workflow", value: e.workflow_type },
          { label: "Current stage", value: e.current_stage },
          { label: "Hall", value: e.hall ?? "—" },
          { label: "Status", value: e.status.toUpperCase() },
          { label: "Created", value: new Date(e.created_at).toLocaleString() },
        ]),
        actionsSection([
          { label: "Exam access", href: "/exam/permissions", variant: "ghost" },
        ]),
      ],
      detailHref: "/exam/permissions",
      detailLabel: "Exam permissions",
    };
  },
});

/* invigilation — /api/exam/candidate-attendance (read-only candidate status). */
async function fetchInvigilation(id: string): Promise<Record<string, unknown>> {
  // The candidate-attendance endpoint returns an opaque shape; we only use it
  // to confirm the record exists and surface a minimal overview.
  const res = await cachedFetch<unknown>(
    "/api/exam/candidate-attendance",
    { ttlMs: 15_000 },
  );
  if (!res) throw new Error(`Invigilation record ${id} not found`);
  return (res as Record<string, unknown>);
}
register({
  kind: "invigilation",
  async resolve(id) {
    await fetchInvigilation(id);
    return {
      kind: "invigilation",
      title: `Invigilation · ${id}`,
      subtitle: "Exam session attendance",
      status: <StatusBadge text="ACTIVE" tone="ok" />,
      sections: [
        { title: "Overview", content: <p className="text-xs text-text-muted">Exam invigilation record. See the exam panel for full attendance detail.</p> },
        actionsSection([
          { label: "Exam access", href: "/exam/permissions", variant: "ghost" },
        ]),
      ],
      detailHref: "/exam/permissions",
      detailLabel: "Exam permissions",
    };
  },
});

/* ── public API ──────────────────────────────────────────────────────────── */

/* Complaint — /api/complaints/[id] */
interface ComplaintRow {
  id: string;
  complaint_number: string;
  category_code: string;
  category_label?: string;
  title: string;
  status: string;
  priority?: string;
  current_owner_role?: string;
  sla_deadline?: string | null;
  created_at: string;
  raised_by_name?: string | null;
}

async function fetchComplaintById(complaintId: string): Promise<ComplaintRow> {
  const res = await cachedFetch<{ success: boolean; complaint?: ComplaintRow }>(
    `/api/complaints/${encodeURIComponent(complaintId)}`,
    { ttlMs: 15_000 },
  );
  if (!res.complaint) throw new Error(`Complaint ${complaintId} not found`);
  return res.complaint;
}

register({
  kind: "complaint",
  async resolve(id) {
    const c = await fetchComplaintById(id);
    const statusTone: "ok" | "warn" | "danger" | "neutral" =
      c.status === "resolved" || c.status === "closed" ? "ok"
      : c.status === "submitted" || c.status === "acknowledged" ? "warn"
      : "neutral";

    return {
      kind: "complaint",
      title: c.title,
      subtitle: c.complaint_number,
      status: <StatusBadge text={c.status.toUpperCase()} tone={statusTone} />,
      sections: [
        overviewSection([
          { label: "Category", value: c.category_label ?? c.category_code },
          { label: "Priority", value: c.priority ?? "—" },
          { label: "Owner", value: c.current_owner_role ?? "—" },
          { label: "Raised by", value: c.raised_by_name ?? "—" },
          { label: "Created", value: new Date(c.created_at).toLocaleString() },
          { label: "SLA", value: c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : "—" },
        ]),
        actionsSection([
          { label: "All complaints", href: "/student/complaints", variant: "ghost" },
        ]),
      ],
      detailHref: `/student/complaints/${c.id}`,
      detailLabel: "Full complaint",
    };
  },
});

/* Child record — /api/persons (filter by parentId=me, client-side) */
interface ChildRecordRow {
  id: string;
  name?: string;
  fullName?: string;
  roll?: string;
  uniqueId?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

async function fetchChildRecord(personId: string): Promise<ChildRecordRow> {
  const res = await cachedFetch<{ success: boolean; data?: ChildRecordRow[] }>(
    "/api/persons?parentId=me",
    { ttlMs: 30_000 },
  );
  const found = res.data?.find((p) => p.id === personId || p.uniqueId === personId);
  if (!found) throw new Error(`Child record ${personId} not found`);
  return found;
}

register({
  kind: "child_record",
  async resolve(id) {
    const p = await fetchChildRecord(id);
    const onCampus = !!(p.checkedInAt && !p.checkedOutAt);
    const displayName = p.name ?? p.fullName ?? "Unknown ward";
    const roll = p.roll ?? p.uniqueId ?? p.id;

    return {
      kind: "child_record",
      title: displayName,
      subtitle: roll,
      status: <StatusBadge text={onCampus ? "ON CAMPUS" : "OFF CAMPUS"} tone={onCampus ? "ok" : "neutral"} />,
      sections: [
        overviewSection([
          { label: "Roll", value: roll },
          { label: "On campus", value: onCampus ? "Yes" : "No" },
          { label: "Checked in", value: p.checkedInAt ? new Date(p.checkedInAt).toLocaleString() : "—" },
          { label: "Checked out", value: p.checkedOutAt ? new Date(p.checkedOutAt).toLocaleString() : "—" },
        ]),
        actionsSection([
          { label: "Ward status", href: "/guardian/child-status", variant: "primary" },
          { label: "Attendance", href: "/guardian/child-attendance", variant: "ghost" },
          { label: "Movement", href: "/guardian/child-movement", variant: "ghost" },
        ]),
      ],
      detailHref: "/guardian/child-status",
      detailLabel: "Ward detail",
    };
  },
});

/* ── PR-05E: warden / hostel / mess / oie / vp resolvers ───────────────── */

/* The wave-1 (PR-05F-2) resolvers above already register:
   hostel_block, menu, stock_item, meal_day, shift_handover, escalation,
   delegation_status, academic_department. This section only adds the two
   genuinely-new kinds: operational_request (mess) and vp_academic_department
   (a VP-specific variant of academic_department that reads /api/vp/departments). */

interface OperationalRequestRow {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt: string | null;
}

async function fetchOperationalRequest(requestId: string): Promise<OperationalRequestRow> {
  const res = await cachedFetch<{ success: boolean; data?: OperationalRequestRow[] }>(
    "/api/mess/operational-requests",
    { ttlMs: 30_000 },
  );
  const found = res.data?.find((r) => r.id === requestId);
  if (!found) throw new Error(`Operational request ${requestId} not found`);
  return found;
}

register({
  kind: "operational_request",
  async resolve(id) {
    const r = await fetchOperationalRequest(id);
    const open = r.status === "OPEN";
    return {
      kind: "operational_request",
      title: r.title,
      subtitle: r.id,
      status: <StatusBadge text={r.status} tone={open ? "warn" : "ok"} />,
      sections: [
        overviewSection([
          { label: "Category", value: r.category },
          { label: "Priority", value: r.priority },
          { label: "Raised", value: r.createdAt ? new Date(r.createdAt).toLocaleString() : "—" },
        ]),
        actionsSection([
          { label: "All requests", href: "/mess/operational-requests", variant: "ghost" },
        ]),
      ],
      detailHref: "/mess/operational-requests",
      detailLabel: "Operational requests",
    };
  },
});

interface VPAcademicDepartmentRow {
  code: string;
  name: string;
  hodName: string | null;
  faculty: number;
  students: number;
  ratio: number;
  attendancePct: number;
}

async function fetchVPAcademicDepartment(code: string): Promise<VPAcademicDepartmentRow> {
  const res = await cachedFetch<{ success: boolean; data?: VPAcademicDepartmentRow[] }>(
    "/api/vp/departments",
    { ttlMs: 30_000 },
  );
  const found = res.data?.find((d) => d.code === code);
  if (!found) throw new Error(`Department ${code} not found`);
  return found;
}

register({
  kind: "vp_academic_department",
  async resolve(id) {
    const d = await fetchVPAcademicDepartment(id);
    const tone: "ok" | "warn" | "danger" =
      d.attendancePct >= 85 ? "ok" : d.attendancePct >= 70 ? "warn" : "danger";
    return {
      kind: "academic_record",
      title: d.name,
      subtitle: d.code,
      status: <StatusBadge text={`${d.attendancePct}% attendance`} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Department", value: d.name },
          { label: "HOD", value: d.hodName ?? "—" },
          { label: "Students", value: String(d.students) },
          { label: "Faculty", value: String(d.faculty) },
          { label: "Ratio", value: `1:${d.ratio}` },
        ]),
        actionsSection([
          { label: "All departments", href: "/vice-principal/academics/departments", variant: "ghost" },
          { label: "Attendance exceptions", href: "/vice-principal/academics/exceptions", variant: "primary" },
        ]),
      ],
      detailHref: "/vice-principal/academics/exceptions",
      detailLabel: "Attendance exceptions",
    };
  },
});

/* ── PR-05A-1 remainder: person_exception + sla_cell ──────────────────────── */

/* academic_person_exception — attendance exception from /api/vp/academics */
interface AcademicPersonExceptionRow {
  id: string;
  name: string;
  role?: string | null;
  designation?: string | null;
  department?: string | null;
  exceptionKind: string;
  detail?: number | string;
}

async function fetchAcademicPersonException(personId: string): Promise<AcademicPersonExceptionRow> {
  // The attendance exceptions live in /api/vp/academics under data.exceptions.
  // We fetch the full payload and find the matching person id in any of the
  // three lists (absent / late / flagged).
  const res = await cachedFetch<{
    success: boolean;
    data?: {
      exceptions: {
        absent?: Array<AcademicPersonExceptionRow>;
        late?: Array<AcademicPersonExceptionRow>;
        flagged?: Array<AcademicPersonExceptionRow>;
      };
    };
  }>("/api/vp/academics", { ttlMs: 30_000 });

  const ex = res.data?.exceptions;
  if (!ex) throw new Error(`Person exception ${personId} not found`);
  for (const kind of ["absent", "late", "flagged"] as const) {
    const list = ex[kind];
    if (list?.length) {
      const hit = list.find((p) => p.id === personId);
      if (hit) {
        return {
          ...hit,
          exceptionKind: kind,
          detail: kind === "late" ? hit.detail : kind === "flagged" ? (hit as any).reason : undefined,
        };
      }
    }
  }
  throw new Error(`Person exception ${personId} not found`);
}

register({
  kind: "academic_person_exception",
  async resolve(id) {
    const p = await fetchAcademicPersonException(id);
    const kind = p.exceptionKind;
    const tone: "ok" | "warn" | "danger" | "neutral" =
      kind === "absent" ? "danger" : kind === "late" ? "warn" : "neutral";
    const subtitle = [p.department, p.designation ?? p.role].filter(Boolean).join(" · ") || id;

    return {
      kind: "academic_person_exception",
      title: p.name,
      subtitle,
      status: <StatusBadge text={kind.toUpperCase()} tone={tone} />,
      sections: [
        overviewSection([
          { label: "Role", value: p.role ?? "—" },
          { label: "Department", value: p.department ?? "—" },
          { label: "Person ID", value: <code className="font-mono">{id}</code> },
          ...(p.detail != null
            ? [{ label: kind === "late" ? "Minutes late" : "Flag reason", value: kind === "late" ? `${p.detail}m` : String(p.detail) }]
            : []),
        ]),
        actionsSection([
          { label: "All exceptions", href: "/principal/people/attendance", variant: "ghost" },
          { label: "Attention queue", href: "/principal/attention", variant: "ghost" },
        ]),
      ],
      detailHref: "/principal/people/attendance",
      detailLabel: "Attendance exceptions",
    };
  },
});

/* sla_cell — SLA heatmap cell from /api/principal/sla-heatmap */
interface SlaHeatmapCellRow {
  stage: string;
  total: number;
  withinSla: number;
  breached: number;
  rate: number;
}

async function fetchSlaCell(stage: string): Promise<{ cell: SlaHeatmapCellRow; details: unknown[] }> {
  const res = await cachedFetch<{
    success: boolean;
    data?: { cells?: SlaHeatmapCellRow[]; details?: unknown[] };
  }>("/api/principal/sla-heatmap", { ttlMs: 30_000 });
  const cell = res.data?.cells?.find((c) => c.stage === stage);
  if (!cell) throw new Error(`SLA cell for stage "${stage}" not found`);
  return { cell, details: res.data?.details ?? [] };
}

register({
  kind: "sla_cell",
  async resolve(id) {
    const { cell } = await fetchSlaCell(id);
    const isBreached = cell.breached > 0;
    const stageLabel = cell.stage.replace(/_/g, " ");
    return {
      kind: "sla_cell",
      title: `${stageLabel} stage — SLA compliance`,
      subtitle: `${cell.total} tickets in flight · ${cell.rate}% on-time`,
      status: <StatusBadge text={isBreached ? `${cell.breached} BREACHED` : "COMPLIANT"} tone={isBreached ? "danger" : "ok"} />,
      sections: [
        overviewSection([
          { label: "Stage", value: <code className="font-mono">{cell.stage}</code> },
          { label: "Compliance", value: `${cell.rate}%` },
          { label: "Total in flight", value: String(cell.total) },
          { label: "Within SLA / Breached", value: `${cell.withinSla} / ${cell.breached}` },
        ]),
        actionsSection([
          { label: "View overdue", href: "/principal/approvals/overdue", variant: "primary" },
          { label: "Pending approvals", href: "/principal/approvals", variant: "ghost" },
          { label: "Full analytics", href: "/principal/governance/analytics", variant: "ghost" },
        ]),
      ],
      detailHref: "/principal/governance/analytics",
      detailLabel: "View SLA analytics",
    };
  },
});

/**
 * Resolve an entity to its `EntityInspection` model by kind and id.
 *
 * Throws if no resolver is registered for the kind (programmer error)
 * or if the API call fails (network / not-found / auth).
 *
 *   try {
 *     const model = await resolveEntity("gate", "g-1");
 *     inspect(model);
 *   } catch (err) {
 *     // show error state or toast
 *   }
 */
export async function resolveEntity(
  kind: string,
  id: string,
  context?: Record<string, unknown>,
): Promise<EntityInspection> {
  const resolver = REGISTRY.get(kind);
  if (!resolver) {
    throw new Error(
      `No entity resolver registered for kind "${kind}". ` +
        `Available kinds: ${[...REGISTRY.keys()].join(", ")}. ` +
        `Register it in src/components/shared/entityResolvers.tsx.`,
    );
  }
  return resolver.resolve(id, context);
}

/**
 * Check whether a resolver exists for a given kind.
 * Useful for conditionally rendering an `EntityReference` only when the
 * kind is resolvable.
 */
export function hasResolver(kind: string): boolean {
  return REGISTRY.has(kind);
}

/**
 * List all registered entity kinds.
 * Useful for debugging or a "which entities are inspectable?" UI.
 */
export function registeredKinds(): string[] {
  return [...REGISTRY.keys()];
}

/**
 * `useEntityResolver` — a React hook wrapper around `resolveEntity` that
 * adds loading / error state, so a component can do:
 *
 *   const { inspection, loading, error, retry } = useEntityResolver("gate", "g-1");
 *
 * and pass `inspection` to `<EntityInspector inspection={inspection} …>`.
 * This is the bridge that `EntityReference` uses internally.
 */
export function useEntityResolver(
  kind: string | null,
  id: string | null,
  context?: Record<string, unknown>,
) {
  const [inspection, setInspection] = useState<EntityInspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setInspection(null);
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (!kind || !id) return;
    let ignore = false;
    setLoading(true);
    setError(null);
    resolveEntity(kind, id, context)
      .then((model) => {
        if (!ignore) setInspection(model);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load entity");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
    // attempt is in deps so retry() re-triggers the fetch
  }, [kind, id, attempt]);

  return { inspection, loading, error, retry };
}

/* ── re-export types so consumers don't need to import from two files ──── */
export type { EntityInspection, InspectionSection };
