"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface Delegation {
  id: string;
  delegate_role?: string;
  scope?: string;
  starts_at?: string;
  expires_at?: string | null;
  status?: string;
  note?: string | null;
}

interface DelegationsResponse {
  success?: boolean;
  data: {
    delegations: Delegation[];
    auditTrail?: unknown[];
  };
}

export function DelegationsView() {
  const { data, loading } = useApiResource<DelegationsResponse>("/api/principal/delegations", {
    ttlMs: 30_000,
  });

  const delegations = data?.data?.delegations ?? [];
  const activeCount = delegations.filter((d) => d.status === "ACTIVE" || !d.status).length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Delegations Manager</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Delegated authority rules and institutional scope
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label="Total Delegations" value={delegations.length} />
        <KpiCard label="Active Rules" value={activeCount} tone="ok" />
        <KpiCard
          label="Coverage"
          value={activeCount > 0 ? "Protected" : "Direct"}
          tone={activeCount > 0 ? "ok" : "warn"}
        />
      </div>

      {loading && delegations.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : delegations.length === 0 ? (
        <EmptyState title="No active delegations" description="No delegation rules configured." />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {delegations.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{d.delegate_role?.replace(/_/g, " ")}</p>
                  <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                    {d.status ?? "ACTIVE"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Scope: {d.scope ?? "Full"}</p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<Delegation>
              columns={[
                {
                  header: "Delegate Role",
                  accessor: (r) => r.delegate_role?.replace(/_/g, " ") ?? "—",
                },
                {
                  header: "Scope",
                  accessor: (r) => r.scope ?? "All Workflows",
                },
                {
                  header: "Starts",
                  accessor: (r) => (r.starts_at ? new Date(r.starts_at).toLocaleDateString() : "—"),
                },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-xs text-[var(--action-primary)]">
                      {r.status ?? "ACTIVE"}
                    </span>
                  ),
                },
              ]}
              data={delegations}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
