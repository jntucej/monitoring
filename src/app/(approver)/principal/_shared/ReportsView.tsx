"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

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
  const { data, loading } = useApiResource<WeekDigestResponse>("/api/principal/week-digest", {
    ttlMs: 60_000,
  });

  const d = data?.data;
  const breakdown = d?.byWorkflowType ?? [];

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Governance Reports</h1>
        <p className="text-xs text-[var(--text-muted)]">
          7-day digest of campus decisions and workflow distribution
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Pending Now" value={d?.totalPending} />
        <KpiCard label="Decisions Cleared" value={d?.totalApproved} tone="ok" />
        <KpiCard label="Escalations" value={d?.totalEscalated} tone={d?.totalEscalated ? "warn" : "ok"} />
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
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.workflow_type}</p>
                  <span className="font-semibold tabular-nums text-[var(--action-primary)]">
                    {item.count}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<{ workflow_type: string; count: number }>
              columns={[
                {
                  header: "Workflow Category",
                  accessor: (r) => r.workflow_type,
                },
                {
                  header: "Volume This Week",
                  accessor: (r) => r.count,
                },
              ]}
              data={breakdown}
              keyExtractor={(r) => r.workflow_type}
            />
          </div>
        </>
      )}
    </div>
  );
}
