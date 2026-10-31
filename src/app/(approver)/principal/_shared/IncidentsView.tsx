"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface AlertItem {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  created_at?: string;
  status?: string;
}

interface AlertsResponse {
  success?: boolean;
  data: AlertItem[];
}

export function IncidentsView() {
  const { data, loading } = useApiResource<AlertsResponse>("/api/alerts", {
    ttlMs: 15_000,
  });

  const alerts = Array.isArray(data?.data) ? data.data : [];
  const highSeverity = alerts.filter(
    (a) => a.severity === "high" || a.severity === "critical"
  ).length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Incidents & Alerts</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Real-time institutional and security alerts
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Active Alerts" value={alerts.length} />
        <KpiCard label="Critical / High" value={highSeverity} tone={highSeverity > 0 ? "danger" : "ok"} />
        <KpiCard
          label="Status"
          value={highSeverity > 0 ? "Requires Attention" : "All Clear"}
          tone={highSeverity > 0 ? "warn" : "ok"}
        />
      </div>

      {loading && alerts.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : alerts.length === 0 ? (
        <EmptyState title="No active alerts" description="No campus alerts or incidents reported." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">{a.title ?? a.message ?? "Alert"}</p>
                  <span className="rounded-full bg-[var(--action-danger)]/10 px-2 py-0.5 text-xs text-[var(--action-danger)]">
                    {a.severity ?? "alert"}
                  </span>
                </div>
                {a.message && a.title && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{a.message}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AlertItem>
              columns={[
                {
                  header: "Title",
                  accessor: (r) => r.title ?? r.message ?? "Alert",
                },
                {
                  header: "Severity",
                  accessor: (r) => (
                    <span className="rounded-full bg-[var(--action-danger)]/10 px-2 py-0.5 text-xs text-[var(--action-danger)]">
                      {r.severity ?? "normal"}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  accessor: (r) => r.status ?? "OPEN",
                },
              ]}
              data={alerts}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
