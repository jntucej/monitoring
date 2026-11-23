"use client";

import { useState } from "react";
import Link from "next/link";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildGateInspection } from "@/lib/principal/registerInspections";
import {
  buildGateInspection as buildMainGateInspection,
  type GateRecord as MainGateRecord,
  type RoleGate,
} from "./entityInspectionModels";
import { CommandPivotDrawer, type CommandPivotTarget } from "@/components/nav/level3/CommandPivotDrawer";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { getGateEventRulesForRole } from "@/lib/gate-event-rules";

interface GateRecord {
  id: string;
  name: string;
  code?: string;
  gate_code?: string;
  type?: string;
  audience?: string;
  allowed_radius_meters?: number;
  status?: string;
  is_active?: boolean;
  location?: string;
}

function getVerificationType(g: GateRecord): string {
  const t = (g.type ?? "main").toLowerCase();
  if (t === "hostel") return "QR + Hostel Curfew";
  if (t === "backup") return "Manual PIN + QR";
  if (t === "system") return "System Fallback";
  return "QR + Geo-fence";
}

interface GatesResponse {
  success?: boolean;
  data: GateRecord[];
}

export function GatesView() {
  const { data, loading } = useApiResource<GatesResponse>("/api/gates", {
    ttlMs: 30_000,
  });
  const {
    inspection: ourInspection,
    inspect: ourInspect,
    closeInspection,
  } = useEntityInspector();

  const role = useRoleContext();
  const gateRules = getGateEventRulesForRole(
    { role: role.role ?? "principal" },
    { id: "overview", status: "OPEN" },
  );
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildMainGateInspection> | null
  >(null);
  const [pivot, setPivot] = useState<CommandPivotTarget | null>(null);

  const inspectMain = (g: GateRecord) => {
    setMainInspection(buildMainGateInspection(g as unknown as MainGateRecord, gate));
    setPivot({
      kind: "gate",
      id: g.id,
      title: g.name,
      subtitle: `${g.location ?? g.code ?? "Main Campus"} · ${g.status ?? "ACTIVE"}`,
      fullRoute: `/principal/operations/gates/${g.id}`,
      relatedLinks: [
        { label: "Gate Activity", href: "/principal/operations/gates" },
        { label: "Incidents", href: "/principal/operations/incidents" },
        { label: "Hostel", href: "/principal/operations/hostel" },
        { label: "People", href: "/principal/people" },
        { label: "Approvals", href: "/principal/approvals" },
        { label: "Cases", href: "/principal/cases" },
      ],
    });
  };

  const [filter, setFilter] = useState<"all" | "active" | "review">("all");
  const gates = Array.isArray(data?.data) ? data.data : [];
  const isGateActive = (g: GateRecord) =>
    g.is_active !== false && (g.status === "ACTIVE" || !g.status);
  const activeCount = gates.filter(isGateActive).length;
  const reviewCount = gates.length - activeCount;
  const visibleGates =
    filter === "active"
      ? gates.filter(isGateActive)
      : filter === "review"
        ? gates.filter((g) => !isGateActive(g))
        : gates;
  const openInspector = (g: GateRecord) => inspectMain(g);

  return (
    <div className="space-y-4">
      <WeekBar />
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Gate Activity</h1>
          <p className="text-xs text-text-muted">
            Monitored campus entry and exit gates · click any KPI or gate to inspect
          </p>
        </div>
        <Link
          href="/sysadmin/gates"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs font-medium text-action-primary hover:bg-bg-elevated"
        >
          Establish Gates (SysAdmin) &rarr;
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Total Gates"
          value={gates.length}
          onClick={() => setFilter("all")}
        />
        <KpiCard
          label="Operational"
          value={activeCount}
          tone="ok"
          onClick={() => setFilter("active")}
        />
        <KpiCard
          label="Status"
          value={reviewCount === 0 ? "Normal" : `${reviewCount} Review`}
          tone={reviewCount === 0 ? "ok" : "warn"}
          onClick={() => {
            if (reviewCount > 0) setFilter("review");
            else if (gates.length > 0) openInspector(gates[0]);
          }}
        />
      </div>

      {loading && gates.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : visibleGates.length === 0 ? (
        <EmptyState title="No gates match this filter" description="Click Total Gates above to view all configured gates." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {visibleGates.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => openInspector(g)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openInspector(g);
                  }}
                  aria-label={`Inspect gate: ${g.name}`}
                  className="surface-card block w-full bg-bg-surface p-3 text-left cursor-pointer hover:bg-bg-surface/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{g.name}</p>
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {isGateActive(g) ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {g.location ?? g.gate_code ?? g.code ?? "Main Campus"} · {getVerificationType(g)}
                  </p>
                  <Link
                    href={`/principal/operations/gates/${g.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 inline-block text-xs font-semibold text-action-primary hover:underline"
                  >
                    Open Gate Page &rarr;
                  </Link>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<GateRecord>
              onRowClick={openInspector}
              columns={[
                { header: "Name", accessor: (r) => r.name },
                { header: "Code", accessor: (r) => r.gate_code ?? r.code ?? "—" },
                { header: "Verification", accessor: (r) => getVerificationType(r) },
                { header: "Audience", accessor: (r) => r.audience ?? "all" },
                { header: "Location", accessor: (r) => r.location ?? "Campus" },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {isGateActive(r) ? "ACTIVE" : "INACTIVE"}
                    </span>
                  ),
                },
                {
                  header: "Page",
                  accessor: (r) => (
                    <Link
                      href={`/principal/operations/gates/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-semibold text-action-primary hover:underline"
                    >
                      Open &rarr;
                    </Link>
                  ),
                },
              ]}
              data={visibleGates}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}

      <EntityInspectorPanel inspection={ourInspection} onClose={closeInspection} />
      <EntityInspector inspection={mainInspection} onClose={() => { setMainInspection(null); setPivot(null); }} />
      <CommandPivotDrawer target={pivot} onClose={() => setPivot(null)} />
    </div>
  );
}
