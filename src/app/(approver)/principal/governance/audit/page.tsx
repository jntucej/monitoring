"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import { EntityInspector, KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";
import { ExternalLink, ChevronRight } from "lucide-react";
import type { DecisionView } from "@/app/api/principal/decisions/route";

/**
 * /principal/governance/audit — the audit ledger. Each audit event is a
 * durable decision: clicking the article opens the standardized decision
 * inspection (provenance → reason → timeline → audit actions) without
 * leaving the register.
 */
export default function AuditPage() {
  const [active, setActive] = useState<DecisionView | null>(null);

  const inspection = active
    ? {
        kind: "audit_event",
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
                    value: <span className="font-mono text-action-primary">{active.authority_source}</span>,
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
            collapsible: true,
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
                <InspectorButton href="/principal/decisions" variant="ghost">
                  <ExternalLink className="size-3.5" /> Decision ledger
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

  const { data, loading } = useApiResource<{ success: boolean; data: { decisions: DecisionView[] } }>(
    "/api/principal/decisions?limit=50",
    { ttlMs: 30_000, enabled: true },
  );
  const rows = data?.data?.decisions ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="Audit Ledger" subtitle="Reconstruct why every consequential action happened — click any event to inspect" />
      <ContextSituationBar
        roleLabel="Principal"
        purpose="Forensic audit ledger documenting every consequential administrative and security action"
        contextLabel="Institutional Audit Ledger"
        statusSummary="Reconstruct reasons, actors, and timelines for every consequential campus action."
        primaryAction={{ label: "Governance Reports", href: "/principal/governance/reports" }}
        secondaryAction={{ label: "Decision Ledger", href: "/principal/decisions" }}
      />
      {loading && <Loading />}
      {!loading && rows.length === 0 && <EmptyState title="No audit records" description="The institutional decision ledger is empty." />}
      <div className="space-y-2">
        {rows.map((d) => (
          <article
            key={d.id}
            className="surface-card p-3 text-xs cursor-pointer hover:bg-bg-surface/60 transition-colors"
            role="button"
            tabIndex={0}
            onClick={() => setActive(d)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setActive(d);
            }}
          >
            <p className="font-mono text-text-primary">{d.decision_no}</p>
            <p className="mt-1 text-text-muted">
              {d.operation} by {d.actor_role} ({d.authority_source}) · {d.role_context}
            </p>
            <p className="mt-1 text-text-secondary max-w-[30rem] truncate">{d.reason}</p>
          </article>
        ))}
      </div>

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
