"use client";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { AttentionItemRow } from "@/lib/institutional/attention";
import { EntityInspector, KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };

export default function AttentionPage() {
  const { data, loading } = useApiResource<{ success: boolean; data: { items: AttentionItemRow[]; total: number } }>(
    "/api/principal/attention?limit=50",
    { ttlMs: 15_000 },
  );
  const items = (data?.data?.items ?? []).slice().sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const [active, setActive] = useState<AttentionItemRow | null>(null);

  /** Standardized inspection model for an attention item (what → source →
   *  suggested action → expiry → act). */
  const inspection = active
    ? {
        kind: "attention",
        title: active.title,
        subtitle: active.detail,
        status: (
          <span
            className={
              "rounded px-1.5 py-0.5 text-[10px] font-bold " +
              (active.severity === "CRITICAL"
                ? "bg-red-500/10 text-red-600"
                : active.severity === "WARNING"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-blue-500/10 text-blue-600")
            }
          >
            {active.severity}
          </span>
        ),
        sections: [
          {
            title: "What needs your attention",
            content: (
              <KVPairs
                columns={1}
                items={[
                  { label: "Detail", value: active.detail },
                  {
                    label: "Source",
                    value: (
                      <span className="font-mono text-xs">
                        {active.source_kind} · {active.source_id.slice(0, 8)}
                      </span>
                    ),
                  },
                  ...(active.case_id
                    ? [{ label: "Case", value: <span className="font-mono text-xs">{active.case_id.slice(0, 8)}</span> }]
                    : []),
                ]}
              />
            ),
          },
          {
            title: "Suggested action",
            content: active.recommended_action ? (
              <p className="text-xs text-text-secondary">{active.recommended_action}</p>
            ) : (
              <p className="text-xs text-text-muted">No suggested action recorded.</p>
            ),
          },
          {
            title: "Timeline",
            content: (
              <Timeline
                items={[
                  {
                    label: "Raised",
                    time: new Date(active.created_at).toLocaleString(),
                    tone: "neutral",
                  },
                  ...(active.expires_at
                    ? [{
                        label: "Expires",
                        time: new Date(active.expires_at).toLocaleString(),
                        tone: "warn" as const,
                      }]
                    : []),
                  ...(active.resolved ? [{ label: "Resolved", tone: "ok" as const }] : []),
                ]}
              />
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                {active.case_id ? (
                  <InspectorButton href="/principal/decisions" variant="ghost">
                    <ExternalLink className="size-3.5" /> Decision ledger
                  </InspectorButton>
                ) : null}
                <InspectorButton href="/principal/escalations" variant="ghost">
                  <ChevronRight className="size-3.5" /> Escalations
                </InspectorButton>
              </div>
            ),
          },
        ],
      }
    : null;

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
          <article
            key={i.id}
            className="surface-card p-4 cursor-pointer hover:bg-bg-surface/60 transition-colors"
            onClick={() => setActive(i)}
          >
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

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
