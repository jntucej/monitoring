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

/* ── public API ──────────────────────────────────────────────────────────── */

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
