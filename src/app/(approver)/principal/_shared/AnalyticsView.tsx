"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface SlaHeatmapCell {
  stage: string;
  total: number;
  withinSla: number;
  breached: number;
  rate: number;
}

interface SlaHeatmapResponse {
  success?: boolean;
  data: {
    cells: SlaHeatmapCell[];
    details?: unknown[];
  };
}

export function AnalyticsView() {
  const { data, loading } = useApiResource<SlaHeatmapResponse>("/api/principal/sla-heatmap", {
    ttlMs: 30_000,
  });

  const cells = data?.data?.cells ?? [];
  const totalBreached = cells.reduce((sum, c) => sum + (c.breached ?? 0), 0);
  const totalVolume = cells.reduce((sum, c) => sum + (c.total ?? 0), 0);
  const overallRate = totalVolume > 0 ? Math.round(((totalVolume - totalBreached) / totalVolume) * 100) : 100;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Department Analytics</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Stage-by-stage SLA compliance and operational efficiency
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
              <li
                key={c.stage}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.stage.replace(/_/g, " ")}</p>
                  <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                    {c.rate}% on-time
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-[var(--text-secondary)]">
                  <span>Total: {c.total}</span>
                  <span>Within SLA: {c.withinSla}</span>
                  <span className={c.breached > 0 ? "text-[var(--action-danger)]" : ""}>
                    Breached: {c.breached}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<SlaHeatmapCell>
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
    </div>
  );
}
