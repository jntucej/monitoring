"use client";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import type { DecisionView } from "@/app/api/principal/decisions/route";

export default function AuditPage() {
  const { data, loading } = useApiResource<{ success: boolean; data: { decisions: DecisionView[] } }>(
    "/api/principal/decisions?limit=50",
    { ttlMs: 30_000, enabled: true },
  );
  const rows = data?.data?.decisions ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="Audit Ledger" subtitle="Reconstruct why every consequential action happened" />
      {loading && <Loading />}
      {!loading && rows.length === 0 && <EmptyState title="No audit records" description="The institutional decision ledger is empty." />}
      <div className="space-y-2">
        {rows.map((d) => (
          <article key={d.id} className="surface-card p-3 text-xs">
            <p className="font-mono text-text-primary">{d.decision_no}</p>
            <p className="mt-1 text-text-muted">
              {d.operation} by {d.actor_role} ({d.authority_source}) · {d.role_context}
            </p>
            <p className="mt-1 text-text-secondary max-w-[30rem] truncate">{d.reason}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
