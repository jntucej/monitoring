"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import {
  buildDelegationInspection,
  type DelegationRecord,
  type RoleGate,
} from "./entityInspectionModels";

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

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const [inspection, setInspection] = useState<
    ReturnType<typeof buildDelegationInspection> | null
  >(null);
  const inspect = (d: Delegation) =>
    setInspection(buildDelegationInspection(d as DelegationRecord, gate));

  const delegations = data?.data?.delegations ?? [];
  const activeCount = delegations.filter((d) => d.status === "ACTIVE" || !d.status).length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-text-primary">Delegations Manager</h1>
        <p className="text-xs text-text-muted">
          Delegated authority rules and institutional scope · click any rule to inspect
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                className="surface-card bg-bg-surface p-3 cursor-pointer hover:bg-bg-surface/60 transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => inspect(d)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inspect(d);
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{d.delegate_role?.replace(/_/g, " ")}</p>
                  <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
                    {d.status ?? "ACTIVE"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">Scope: {d.scope ?? "Full"}</p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<Delegation>
              onRowClick={(d) => inspect(d)}
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
                    <span className="surface-card bg-action-primary/10 px-2 py-0.5 text-xs text-action-primary">
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

      <EntityInspector inspection={inspection} onClose={() => setInspection(null)} />
    </div>
  );
}
