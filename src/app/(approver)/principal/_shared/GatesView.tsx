"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface Gate {
  id: string;
  name: string;
  code?: string;
  status?: string;
  location?: string;
}

interface GatesResponse {
  success?: boolean;
  data: Gate[];
}

export function GatesView() {
  const { data, loading } = useApiResource<GatesResponse>("/api/gates", {
    ttlMs: 30_000,
  });

  const gates = Array.isArray(data?.data) ? data.data : [];
  const activeCount = gates.filter((g) => g.status === "ACTIVE" || !g.status).length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Gate Activity</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Monitored campus entry and exit gates
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total Gates" value={gates.length} />
        <KpiCard label="Operational" value={activeCount} tone="ok" />
        <KpiCard
          label="Status"
          value={activeCount > 0 ? "Normal" : "Review"}
          tone={activeCount > 0 ? "ok" : "warn"}
        />
      </div>

      {loading && gates.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : gates.length === 0 ? (
        <EmptyState title="No gates configured" description="Gate records are currently unavailable." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {gates.map((g) => (
              <li
                key={g.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{g.name}</p>
                  <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                    {g.status ?? "ACTIVE"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{g.location ?? g.code ?? "Main Campus"}</p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<Gate>
              columns={[
                { header: "Name", accessor: (r) => r.name },
                { header: "Code", accessor: (r) => r.code ?? "—" },
                { header: "Location", accessor: (r) => r.location ?? "Campus" },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                      {r.status ?? "ACTIVE"}
                    </span>
                  ),
                },
              ]}
              data={gates}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
