"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface StudentsStatsResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    onCampusToday: number;
    todayEntries: number;
    todayExits: number;
  };
}

export function ReportsView() {
  const { data, loading } = useApiResource<StudentsStatsResponse>("/api/students/stats", {
    ttlMs: 30_000,
  });

  const stats = data?.data;

  const rows = stats
    ? [
        { metric: "On Campus Today", value: stats.onCampusToday, description: "Students present on campus" },
        { metric: "Today Inbound Movements", value: stats.todayEntries, description: "Logged entry scans" },
        { metric: "Today Outbound Movements", value: stats.todayExits, description: "Logged exit scans" },
        { metric: "Active Enrolled Students", value: stats.active, description: "Total active enrolled roster" },
      ]
    : [];

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Supervisor Reports</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Real-time gate traffic, campus presence, and activity metrics
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="On Campus Today" value={stats?.onCampusToday} tone="ok" />
        <KpiCard label="Entries Today" value={stats?.todayEntries} tone="info" />
        <KpiCard label="Exits Today" value={stats?.todayExits} tone="warn" />
        <KpiCard label="Active Students" value={stats?.active} tone="neutral" />
      </div>

      {loading && !stats ? (
        <ListSkeleton rows={4} />
      ) : !stats ? (
        <EmptyState
          title="No report metrics"
          description="Campus statistics are currently unavailable."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((row) => (
              <li
                key={row.metric}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{row.metric}</p>
                  <span className="font-semibold tabular-nums text-lg text-[var(--text-primary)]">
                    {row.value}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{row.description}</p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<{ metric: string; value: number; description: string }>
              columns={[
                { header: "Activity Metric", accessor: (r) => r.metric },
                {
                  header: "Count",
                  accessor: (r) => (
                    <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                      {r.value}
                    </span>
                  ),
                },
                {
                  header: "Description",
                  accessor: (r) => <span className="text-[var(--text-muted)]">{r.description}</span>,
                },
              ]}
              data={rows}
              keyExtractor={(r) => r.metric}
            />
          </div>
        </>
      )}
    </div>
  );
}
