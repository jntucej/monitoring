"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApiResource } from "@/hooks/useApiResource";
import { useRoleContext } from "@/hooks/useRoleContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildDelegationInspection } from "@/lib/principal/registerInspections";
import {
  buildDelegationInspection as buildMainDelegationInspection,
  type DelegationRecord,
  type RoleGate,
} from "./entityInspectionModels";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";
import { PrincipalEmptyReconciler } from "@/components/nav/level3/PrincipalRecordHub";
import { SmartTextRef } from "@/components/nav/SmartTextRef";

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
  const { data: dashData } = useApiResource<{
    data?: { pendingCount?: number; delegatedCount?: number };
  }>("/api/principal/dashboard", { ttlMs: 30_000 });
  const pendingCount = dashData?.data?.pendingCount ?? 0;
  const delegatedCount = dashData?.data?.delegatedCount ?? 0;

  const role = useRoleContext();
  const gate: RoleGate = {
    isPrincipal: role.isPrincipal,
    isFaculty: role.isFaculty,
    role: role.role ?? null,
  };
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [mainInspection, setMainInspection] = useState<
    ReturnType<typeof buildMainDelegationInspection> | null
  >(null);
  const inspectMain = (d: Delegation) =>
    setMainInspection(buildMainDelegationInspection(d as DelegationRecord, gate));

  const delegations = data?.data?.delegations ?? [];
  const isActive = (d: Delegation) => (d.status ?? "ACTIVE").toUpperCase() === "ACTIVE";
  const activeCount = delegations.filter(isActive).length;
  const inactiveCount = delegations.length - activeCount;
  const visibleDelegations = delegations.filter((d) => {
    if (filter === "active") return isActive(d);
    if (filter === "inactive") return !isActive(d);
    return true;
  });
  const openInspector = (d: Delegation) => inspectMain(d);

  return (
    <div className="space-y-4">
      <WeekBar />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Delegations Manager</h1>
          <p className="text-xs text-text-muted">
            Delegated authority rules and institutional scope · click any rule to inspect or revoke
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Delegation filters">
            {[
              { key: "all" as const, label: "All", count: delegations.length },
              { key: "active" as const, label: "Active", count: activeCount },
              { key: "inactive" as const, label: "Inactive", count: inactiveCount },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? "border-action-primary bg-action-primary/10 text-action-primary"
                    : "border-border bg-bg-surface text-text-secondary hover:bg-bg-elevated"
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[11px] opacity-80">{tab.count}</span>
              </button>
            ))}
          </nav>
          <Link
            href="/principal/approvals/delegated"
            className="rounded-lg border border-border bg-bg-surface px-2.5 py-1 text-xs font-medium text-action-primary hover:bg-bg-elevated"
          >
            Delegated Queue &rarr;
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Total Delegations" value={delegations.length} onClick={() => setFilter("all")} />
        <KpiCard label="Active Rules" value={activeCount} tone="ok" onClick={() => setFilter("active")} />
        <KpiCard
          label="Coverage"
          value={activeCount > 0 ? "Protected" : "Direct"}
          tone={activeCount > 0 ? "ok" : "warn"}
          onClick={() => router.push("/principal/approvals/delegated")}
        />
      </div>

      {loading && delegations.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : visibleDelegations.length === 0 ? (
        <PrincipalEmptyReconciler
          title="No matching delegations"
          breakdown={[
            { label: "Delegated Approvals", count: delegatedCount, href: "/principal/approvals/delegated" },
            { label: "Pending Queue", count: pendingCount, href: "/principal/approvals/pending" },
          ]}
        />
      ) : (
        <DataTable<Delegation>
          mobileLayout="cards"
          onRowClick={openInspector}
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
            {
              header: "Overview",
              accessor: (r) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInspector(r);
                  }}
                  className="text-xs font-semibold text-action-primary hover:underline"
                >
                  Open &rarr;
                </button>
              ),
            },
          ]}
          data={visibleDelegations}
          keyExtractor={(r) => r.id}
        />
      )}

      <EntityInspector inspection={mainInspection} onClose={() => setMainInspection(null)} />
    </div>
  );
}
