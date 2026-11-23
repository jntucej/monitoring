"use client";

import { useState } from "react";
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

interface GateRecord {
  id: string;
  name: string;
  code?: string;
  status?: string;
  location?: string;
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
      fullRoute: `/admin/gates/${g.id}`,
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

  const gates = Array.isArray(data?.data) ? data.data : [];
  const activeCount = gates.filter((g) => g.status === "ACTIVE" || !g.status).length;
  const openInspector = (g: GateRecord) => ourInspect(buildGateInspection(g));

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Gate Activity</h1>
        <p className="text-xs text-text-muted">
          Monitored campus entry and exit gates · click any gate to inspect
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Total Gates"
          value={gates.length}
        />
        <KpiCard
          label="Operational"
          value={activeCount}
          tone="ok"
        />
        <KpiCard
          label="Status"
          value={activeCount > 0 ? "Normal" : "Review"}
          tone={activeCount > 0 ? "ok" : "warn"}
        />
      </div>

      {loading && gates.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : gates.length === 0 ? (
        <EmptyState title="No gates configured" description="Gate records are currently unavailable." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {gates.map((g) => (
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
                      {g.status ?? "ACTIVE"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{g.location ?? g.code ?? "Main Campus"}</p>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<GateRecord>
              onRowClick={openInspector}
              columns={[
                { header: "Name", accessor: (r) => r.name },
                { header: "Code", accessor: (r) => r.code ?? "—" },
                { header: "Location", accessor: (r) => r.location ?? "Campus" },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {r.status ?? "ACTIVE"}
                    </span>
                  ),
                },
              ]}
              data={gates}
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
