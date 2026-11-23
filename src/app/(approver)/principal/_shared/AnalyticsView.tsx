"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildSlaCellInspection,
  type SlaCellRecord,
  type RoleGate,
} from "./entityInspectionModels";

interface SlaHeatmapCell {
  stage: string;
  total: number;
  withinSla: number;
  breached: number;
  rate: number;
}

interface SlaHeatmapDetail {
  stage: string;
  workflow_type: string;
  total: number;
  within_sla: number;
  breached: number;
}

interface SlaHeatmapResponse {
  success?: boolean;
  data: {
    cells: SlaHeatmapCell[];
    details?: SlaHeatmapDetail[];
  };
}

/** Build the per-workflow breakdown for a given stage from the raw details rows. */
function byWorkflowForStage(stage: string, details: SlaHeatmapDetail[] | undefined) {
  if (!details?.length) return undefined;
  const rows = details
    .filter((d) => d.stage === stage)
    .map((d) => ({
      workflow_type: d.workflow_type,
      total: d.total,
      withinSla: d.within_sla,
      breached: d.breached,
    }));
  return rows.length > 0 ? rows : undefined;
}

export function AnalyticsView() {
  const { data, loading } = useApiResource<SlaHeatmapResponse>("/api/principal/sla-heatmap", {
    ttlMs: 30_000,
  });

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };

  const [inspection, setInspection] = useState<
    ReturnType<typeof buildSlaCellInspection> | null
  >(null);

  const cells = data?.data?.cells ?? [];
  const details = data?.data?.details;
  const totalBreached = cells.reduce((sum, c) => sum + (c.breached ?? 0), 0);
  const totalVolume = cells.reduce((sum, c) => sum + (c.total ?? 0), 0);
  const overallRate = totalVolume > 0 ? Math.round(((totalVolume - totalBreached) / totalVolume) * 100) : 100;

  const inspectCell = (cell: SlaHeatmapCell) => {
    const record: SlaCellRecord = {
      ...cell,
      byWorkflow: byWorkflowForStage(cell.stage, details),
    };
    setInspection(buildSlaCellInspection(record, gate));
  };

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Department Analytics</h1>
        <p className="text-xs text-text-muted">
          Stage-by-stage SLA compliance and operational efficiency
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Stages Tracked" value={cells.length} />
        <KpiCard label="Total in Flight" value={totalVolume} />
        <KpiCard label="SLA Breached" value={totalBreached} tone={totalBreached > 0 ? "danger" : "ok"} />
        <KpiCard label="SLA Compliance" value={`${overallRate}%`} tone="ok" />
      </div>

      {loading && cells.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : cells.length === 0 ? (
        <EmptyState title="No SLA data available" description="Analytics will populate as requests are processed." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {cells.map((c) => (
              <li key={c.stage}>
                <button
                  type="button"
                  className="surface-card bg-bg-surface p-3 w-full text-left cursor-pointer hover:bg-bg-elevated transition-colors"
                  onClick={() => inspectCell(c)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{c.stage.replace(/_/g, " ")}</p>
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                      {c.rate}% on-time
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-text-secondary">
                    <span>Total: {c.total}</span>
                    <span>Within SLA: {c.withinSla}</span>
                    <span className={c.breached > 0 ? "text-action-danger" : ""}>
                      Breached: {c.breached}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<SlaHeatmapCell>
              onRowClick={(cell) => inspectCell(cell)}
              columns={[
                {
                  header: "Stage",
                  accessor: (r) => r.stage.replace(/_/g, " "),
                },
                {
                  header: "Total",
                  accessor: (r) => r.total,
                },
                {
                  header: "Within SLA",
                  accessor: (r) => r.withinSla,
                },
                {
                  header: "Breached",
                  accessor: (r) => r.breached,
                },
                {
                  header: "Compliance",
                  accessor: (r) => `${r.rate}%`,
                },
              ]}
              data={cells}
              keyExtractor={(r) => r.stage}
            />
          </div>
        </>
      )}

      <EntityInspector inspection={inspection} onClose={() => setInspection(null)} />
    </div>
  );
}
