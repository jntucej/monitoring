"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
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

export function AnalyticsView({ initialStage }: { initialStage?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stageFilter, setStageFilter] = useState<string | null>(initialStage ?? null);
  const [breachedOnly, setBreachedOnly] = useState(false);

  const { data, loading } = useApiResource<SlaHeatmapResponse>("/api/principal/sla-heatmap", {
    ttlMs: 30_000,
  });

  // Drilldown entry points: the analytics page is also reached from KPI cards
  // via ?stage=<name> / ?breached=1 — those land pre-filtered on the
  // underlying records, which is what makes the metric a control, not a number.
  const initialStageParam = searchParams.get("stage") ?? undefined;
  const breachedParam = searchParams.get("breached") === "1";
  const activeStage = initialStageParam ?? stageFilter;
  const breachedView = breachedParam || breachedOnly;

  useEffect(() => {
    if (initialStageParam !== undefined || breachedParam) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("stage");
      sp.delete("breached");
      router.replace(
        sp.size ? `?${sp.toString()}` : window.location.pathname,
        { scroll: false },
      );
    }
    // Run once per param set — clear the consumed drilldown params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStageParam, breachedParam]);

  const cells = (data?.data?.cells ?? []).filter((c) => {
    if (activeStage && c.stage !== activeStage) return false;
    if (breachedView && (c.breached ?? 0) === 0) return false;
    return true;
  });
  const totalBreached = cells.reduce((sum, c) => sum + (c.breached ?? 0), 0);
  const totalVolume = cells.reduce((sum, c) => sum + (c.total ?? 0), 0);
  const overallRate = totalVolume > 0 ? Math.round(((totalVolume - totalBreached) / totalVolume) * 100) : 100;

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
        <KpiCard
          label="SLA Breached"
          value={totalBreached}
          tone={totalBreached > 0 ? "danger" : "ok"}
          drilldown={{ label: "View breached stages", href: "/principal/governance/analytics?breached=1" }}
        />
        <KpiCard label="SLA Compliance" value={`${overallRate}%`} tone="ok" />
      </div>

      {(activeStage || breachedView) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeStage && (
            <button
              onClick={() => setStageFilter(null)}
              className="surface-card bg-action-primary/10 px-2 py-1 text-xs font-medium text-action-primary"
            >
              Stage: {activeStage.replace(/_/g, " ")} ✕
            </button>
          )}
          {breachedView && (
            <button
              onClick={() => setBreachedOnly(false)}
              className="surface-card bg-action-danger/10 px-2 py-1 text-xs font-medium text-action-danger"
            >
              Breached only ✕
            </button>
          )}
        </div>
      )}

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
                  onClick={() => setStageFilter(c.stage)}
                  aria-label={`Filter analytics to stage: ${c.stage.replace(/_/g, " ")}`}
                  className="surface-card block w-full bg-bg-surface p-3 text-left"
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
              onRowClick={(r) => {
                // Click a stage → the metric becomes a drilldown control:
                // re-enter the register pre-filtered to that stage.
                router.push(`/principal/governance/analytics?stage=${encodeURIComponent(r.stage)}`);
              }}
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
