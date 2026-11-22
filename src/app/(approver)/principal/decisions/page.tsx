"use client";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import type { DecisionView } from "@/app/api/principal/decisions/route";

export default function DecisionsPage() {
  const { data, loading } = useApiResource<{ success: boolean; data: { decisions: DecisionView[]; total: number } }>(
    "/api/principal/decisions?limit=100",
    { ttlMs: 30_000, enabled: true },
  );
  const rows = data?.data?.decisions ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="Decision Ledger" subtitle="Every consequential action — the institutional decision history" />
      {loading && <Loading />}
      {!loading && rows.length === 0 && <EmptyState title="No decisions recorded" description="The decision ledger is empty." />}
      {!loading && rows.length > 0 && (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-1 text-left text-text-muted">
                <th className="p-3 font-medium">Decision</th>
                <th className="p-3 font-medium">Operation</th>
                <th className="p-3 font-medium">Actor</th>
                <th className="p-3 font-medium">Authority</th>
                <th className="p-3 font-medium">Reason</th>
                <th className="p-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-border-1 last:border-0">
                  <td className="p-3 font-mono text-text-primary">{d.decision_no}</td>
                  <td className="p-3 text-text-secondary">{d.operation}</td>
                  <td className="p-3 text-text-secondary">{d.actor_role}</td>
                  <td className="p-3 text-text-secondary">{d.authority_source}</td>
                  <td className="p-3 text-text-secondary max-w-[16rem] truncate">{d.reason}</td>
                  <td className="p-3 text-text-muted">{new Date(d.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
