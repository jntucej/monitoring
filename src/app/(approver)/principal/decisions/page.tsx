import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
"use client";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import { useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { DecisionView } from "@/app/api/principal/decisions/route";
import { EntityInspector, KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";

export default function DecisionsPage() {
  const [active, setActive] = useState<DecisionView | null>(null);

  /** The standardized inspection model for a durable decision. */
  const inspection = active
    ? {
        kind: "decision",
        title: active.decision_no,
        subtitle: `${active.operation} · ${active.actor_role}`,
        status: (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
            {active.resulting_state ?? "—"}
          </span>
        ),
        sections: [
          {
            title: "Provenance",
            content: (
              <KVPairs
                items={[
                  { label: "Operation", value: <span className="font-mono">{active.operation}</span> },
                  { label: "Actor role", value: active.actor_role },
                  { label: "Role context", value: active.role_context },
                  {
                    label: "Authority source",
                    value: (
                      <span className="font-mono text-action-primary">{active.authority_source}</span>
                    ),
                  },
                  { label: "Case", value: <span className="font-mono text-xs">{active.case_id}</span> },
                ]}
              />
            ),
          },
          {
            title: "Reason",
            content: <p className="text-xs text-text-secondary">{active.reason}</p>,
          },
          {
            title: "Timeline",
            content: (
              <Timeline
                items={[
                  {
                    label: "Decision recorded",
                    time: new Date(active.timestamp).toLocaleString(),
                    tone: "neutral",
                  },
                ]}
              />
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                <InspectorButton href="/principal/governance/audit" variant="ghost">
                  <ExternalLink className="size-3.5" /> Audit trail
                </InspectorButton>
                <InspectorButton href="/principal/escalations" variant="ghost">
                  <ChevronRight className="size-3.5" /> Related escalations
                </InspectorButton>
              </div>
            ),
          },
        ],
      }
    : null;
  const { data, loading } = useApiResource<{ success: boolean; data: { decisions: DecisionView[]; total: number } }>(
    "/api/principal/decisions?limit=100",
    { ttlMs: 30_000, enabled: true },
  );
  const rows = data?.data?.decisions ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="Decision Ledger" subtitle="Every consequential action — the institutional decision history" />
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Immutable institutional decision ledger recording all executive determinations with proof of provenance"
        contextLabel="Executive Decision Ledger"
        statusSummary="Audit all past approvals, rejections, overrides, and delegations with complete timestamps."
        primaryAction={{ label: "Audit Ledger", href: "/principal/governance/audit" }}
        secondaryAction={{ label: "Command Center", href: "/principal" }}
      />
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
                <tr
                  key={d.id}
                  className="border-b border-border-1 last:border-0 hover:bg-bg-surface/50 cursor-pointer transition-colors"
                  onClick={() => setActive(d)}
                >
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

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
