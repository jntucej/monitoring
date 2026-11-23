"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export function AnalyticsView({ initialStage }: { initialStage?: string } = {}) {
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

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };

  const [inspection, setInspection] = useState<
    ReturnType<typeof buildSlaCellInspection> | null
  >(null);

  const details = data?.data?.details;
  const cells = (data?.data?.cells ?? []).filter((c) => {
    if (activeStage && c.stage !== activeStage) return false;
    if (breachedView && (c.breached ?? 0) === 0) return false;
    return true;
  });
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
        <KpiCard
          label="SLA Breached"
          value={totalBreached}
          tone={totalBreached > 0 ? "danger" : "ok"}
          drilldown={{ label: "View breached stages", href: "/principal/governance/analytics?breached=1" }}
        />
        <KpiCard label="SLA Compliance" value={`${overallRate}%`} tone="ok" />
      </div>

      {cells.length > 0 && (
        <div className="surface-card bg-bg-surface/80 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">Insight:</span>{" "}
            {totalBreached > 0
              ? `${totalBreached} SLA breach${totalBreached === 1 ? "" : "es"} across ${cells.filter((c) => c.breached > 0).length} stage(s) — overall compliance is ${overallRate}% (target 95%).`
              : `All ${totalVolume} tracked requests are within SLA (${overallRate}% compliance vs 95% target).`}
          </p>
          <Link
            href={totalBreached > 0 ? "/principal/approvals/overdue" : "/principal/approvals/pending"}
            className="text-xs font-semibold text-action-primary hover:underline shrink-0"
          >
            {totalBreached > 0 ? "Open Overdue Queue →" : "Open Pending Queue →"}
          </Link>
        </div>
      )}

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

      <EntityInspector inspection={inspection} onClose={() => setInspection(null)} />
    </div>
  );
}
