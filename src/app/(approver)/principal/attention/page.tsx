"use client";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import type { AttentionItemRow } from "@/lib/institutional/attention";

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export default function AttentionPage() {
  const { data, loading } = useApiResource<{ success: boolean; data: { items: AttentionItemRow[]; total: number } }>(
    "/api/principal/attention?limit=50",
    { ttlMs: 15_000 },
  );
  const items = (data?.data?.items ?? []).slice().sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Institutional Attention"
        subtitle="What requires your decision — compressed, not raw"
      />
      {loading && <Loading />}
      {!loading && items.length === 0 && <EmptyState title="Nothing requires attention" description="The executive attention queue is clear." />}
      <div className="space-y-2">
        {items.map((i) => (
          <article key={i.id} className="surface-card p-4">
            <header className="flex items-center gap-2">
              <span
                className={
                  "rounded px-1.5 py-0.5 text-[10px] font-medium " +
                  (i.severity === "CRITICAL"
                    ? "bg-red-500/10 text-red-600"
                    : i.severity === "WARNING"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-blue-500/10 text-blue-600")
                }
              >
                {i.severity}
              </span>
              <h2 className="text-sm font-medium text-text-primary truncate">{i.title}</h2>
            </header>
            <p className="mt-1 text-xs text-text-muted">{i.detail}</p>
            {i.recommended_action ? (
              <p className="mt-1 text-xs text-text-muted">
                <span className="font-medium text-text-secondary">Suggested:</span> {i.recommended_action}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
