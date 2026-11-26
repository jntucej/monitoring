"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useRoleContext } from "@/hooks/useRoleContext";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildReportInspection,
  type ReportRecord,
  type RoleGate,
} from "./entityInspectionModels";

const wfHref = (wf: string) => `/principal/approvals?workflowType=${encodeURIComponent(wf)}`;

interface WeekDigestResponse {
  success?: boolean;
  data: {
    totalPending: number;
    totalApproved: number;
    totalEscalated: number;
    byWorkflowType: Array<{ workflow_type: string; count: number }>;
    series: Array<{ label: string; count: number }>;
  };
}

export function ReportsView() {
  const router = useRouter();
  const { data, loading } = useApiResource<WeekDigestResponse>("/api/principal/week-digest", {
    ttlMs: 60_000,
  });

  const d = data?.data;
  const breakdown = d?.byWorkflowType ?? [];

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [inspection, setInspection] = useState<
    ReturnType<typeof buildReportInspection> | null
  >(null);
  const inspect = (item: { workflow_type: string; count: number }) =>
    setInspection(
      buildReportInspection(
        {
          workflow_type: item.workflow_type,
          count: item.count,
          totalPending: d?.totalPending,
          totalApproved: d?.totalApproved,
          totalEscalated: d?.totalEscalated,
        } satisfies ReportRecord,
        gate
      )
    );

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Governance Reports</h1>
        <p className="text-xs text-text-muted">
          7-day digest of campus decisions and workflow distribution
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Pending Now"
          value={d?.totalPending}
          drilldown={{ label: "View decisions", href: "/principal/approvals" }}
          onClick={
            breakdown.length > 0 ? () => inspect({ workflow_type: "pending", count: d?.totalPending ?? 0 }) : undefined
          }
        />
        <KpiCard
          label="Decisions Cleared"
          value={d?.totalApproved}
          tone="ok"
          drilldown={{ label: "View decisions", href: "/principal/decisions" }}
          onClick={
            breakdown.length > 0
              ? () => inspect({ workflow_type: "approved", count: d?.totalApproved ?? 0 })
              : undefined
          }
        />
        <KpiCard
          label="Escalations"
          value={d?.totalEscalated}
          tone={d?.totalEscalated ? "warn" : "ok"}
          drilldown={{ label: "View escalations", href: "/principal/escalations" }}
          onClick={
            breakdown.length > 0
              ? () => inspect({ workflow_type: "escalated", count: d?.totalEscalated ?? 0 })
              : undefined
          }
        />
      </div>

      {loading && !d ? (
        <ListSkeleton rows={5} />
      ) : breakdown.length === 0 ? (
        <EmptyState title="No report data" description="Weekly records will populate after decisions occur." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {breakdown.map((item) => (
              <li
                key={item.workflow_type}
                className="surface-card bg-bg-surface p-3 cursor-pointer hover:bg-bg-surface/60 transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => inspect(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inspect(item);
                }}
              >
                <div className="flex items-center justify-between">
                  <a
                    href={wfHref(item.workflow_type)}
                    aria-label={`Open pending approvals for ${item.workflow_type}`}
                    className="text-sm font-medium"
                  >
                    {item.workflow_type}
                  </a>
                  <span className="font-semibold tabular-nums text-action-primary">
                    {item.count}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<{ workflow_type: string; count: number }>
              onRowClick={(r) => inspect(r)}
              columns={[
                {
                  header: "Workflow Category",
                  accessor: (r) => r.workflow_type,
                },
                {
                  header: "Volume This Week",
                  accessor: (r) => r.count,
                },
                {
                  header: "Queue",
                  accessor: (r) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(wfHref(r.workflow_type));
                      }}
                      className="text-xs font-semibold text-action-primary hover:underline"
                    >
                      View Queue &rarr;
                    </button>
                  ),
                },
              ]}
              data={breakdown}
              keyExtractor={(r) => r.workflow_type}
            />
          </div>
        </>
      )}

      <EntityInspector inspection={inspection} onClose={() => setInspection(null)} />
    </div>
  );
}
