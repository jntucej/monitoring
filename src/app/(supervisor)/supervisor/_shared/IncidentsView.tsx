"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface IncidentItem {
  id: string;
  severity: string;
  title: string;
  timestamp: string;
  resolved: boolean;
}

interface IncidentsResponse {
  data: {
    incidents: IncidentItem[];
  };
}

export function IncidentsView() {
  const { data, loading } = useApiResource<IncidentsResponse>(
    "/api/supervisor/dashboard",
    { ttlMs: 15_000 }
  );

  const rows = data?.data?.incidents ?? [];

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Incidents</h1>
        <p className="text-xs text-[var(--text-muted)]">
          {rows.length} incident{rows.length === 1 ? "" : "s"} logged in last 24h
        </p>
      </header>

      {loading && rows.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="No incidents" description="No safety or security alerts reported." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">{item.title}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      item.resolved
                        ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                        : "bg-[var(--action-danger)]/10 text-[var(--action-danger)]"
                    }`}
                  >
                    {item.resolved ? "Resolved" : item.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<IncidentItem>
              columns={[
                {
                  header: "Status",
                  accessor: (r) =>
                    r.resolved ? (
                      <span className="flex items-center gap-1 text-[var(--action-primary)]">
                        <CheckCircle2 className="size-4" /> Resolved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[var(--action-danger)] font-medium">
                        <AlertTriangle className="size-4" /> Open
                      </span>
                    ),
                },
                { header: "Severity", accessor: (r) => <span className="uppercase font-semibold text-xs">{r.severity}</span> },
                { header: "Incident Description", accessor: (r) => r.title },
                {
                  header: "Reported At",
                  accessor: (r) => (
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(r.timestamp).toLocaleString()}
                    </span>
                  ),
                },
              ]}
              data={rows}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
