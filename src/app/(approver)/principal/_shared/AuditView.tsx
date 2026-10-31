"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface AuditLog {
  id: string;
  action: string;
  user_name?: string | null;
  user_role?: string | null;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

interface AuditResponse {
  success?: boolean;
  data: AuditLog[];
}

export function AuditView() {
  const { data, loading } = useApiResource<AuditResponse>("/api/principal/audit", {
    ttlMs: 30_000,
  });

  const logs = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Audit Trail</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Decisions, overrides, and governance records
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label="Recent Events" value={logs.length} />
        <KpiCard label="Audit Logging" value="Active" tone="ok" />
        <KpiCard label="Integrity" value="Verified" tone="ok" />
      </div>

      {loading && logs.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <EmptyState title="No audit entries" description="No audit log events found." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{log.action}</p>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {log.user_name ?? "System"} ({log.user_role ?? "sys"})
                </p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AuditLog>
              columns={[
                { header: "Action", accessor: (r) => r.action },
                { header: "Actor", accessor: (r) => r.user_name ?? "System" },
                { header: "Role", accessor: (r) => r.user_role ?? "—" },
                {
                  header: "Timestamp",
                  accessor: (r) => new Date(r.timestamp).toLocaleString(),
                },
              ]}
              data={logs}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
