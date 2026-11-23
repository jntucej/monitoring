"use client";

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PageHeader } from "@/components/principal/shared/PrincipalPageHeader";
import { PrincipalEmptyState as EmptyState } from "@/components/principal/shared/PrincipalEmptyState";
import { PageLoading as Loading } from "@/components/principal/shared/PrincipalLoadingStates";
import { EntityInspector, KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";
import { ChevronRight } from "lucide-react";
import type { EmergencyCommandRow } from "@/lib/institutional/emergency";

const STATE_COLOR: Record<string, string> = {
  NORMAL: "bg-emerald-500/10 text-emerald-600",
  ELEVATED: "bg-amber-500/10 text-amber-600",
  CRITICAL: "bg-orange-500/10 text-orange-600",
  EMERGENCY: "bg-red-500/10 text-red-600",
  LOCKDOWN: "bg-red-600/20 text-red-700",
};

/**
 * /principal/emergency — the command plane. Each emergency command record
 * is an entity: clicking the card opens the standardized inspection
 * (overview → context → timeline → actions) without leaving the page.
 */
export default function EmergencyPage() {
  const [active, setActive] = useState<EmergencyCommandRow | null>(null);

  const inspection = active
    ? {
        kind: "emergency",
        title: `Command · ${active.state}`,
        subtitle: active.review_status,
        status: (
          <span className={"rounded px-1.5 py-0.5 text-[10px] font-bold uppercase " + (STATE_COLOR[active.state] ?? "")}>
            {active.state}
          </span>
        ),
        sections: [
          {
            title: "Overview",
            content: (
              <KVPairs
                items={[
                  { label: "State", value: <span className="font-mono">{active.state}</span> },
                  { label: "Review status", value: active.review_status },
                  { label: "Actor", value: active.actor_role },
                  ...(active.scopes.length > 0
                    ? [{ label: "Scopes", value: active.scopes.join(", ") }]
                    : []),
                ]}
              />
            ),
          },
          {
            title: "Context",
            content: (
              <p className="text-xs text-text-secondary">
                {active.reason || "No reason recorded for this command."}
              </p>
            ),
          },
          {
            title: "Timeline",
            collapsible: true,
            content: (
              <Timeline
                items={[
                  {
                    label: "Command issued",
                    time: new Date(active.created_at).toLocaleString(),
                    tone: "danger",
                  },
                ]}
              />
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                <InspectorButton href="/principal/attention" variant="primary">
                  <ChevronRight className="size-3.5" /> Attention queue
                </InspectorButton>
                <InspectorButton href="/principal/escalations" variant="ghost">
                  <ChevronRight className="size-3.5" /> Escalations
                </InspectorButton>
              </div>
            ),
          },
        ],
      }
    : null;

  const { data, loading } = useApiResource<{ success: boolean; data: { currentState: string; commands: EmergencyCommandRow[] } }>(
    "/api/principal/emergency",
    { ttlMs: 10_000, enabled: true },
  );
  const state = data?.data?.currentState ?? "NORMAL";
  const commands = data?.data?.commands ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="Emergency Command" subtitle="The command plane — bypasses normal workflows, never bypasses authorization + audit" />
      {loading && <Loading />}
      {!loading && (
        <>
          <div className={"surface-card p-4 flex items-center justify-between " + (STATE_COLOR[state] ?? "bg-surface-1")}>
            <div>
              <p className="text-xs font-medium text-text-muted">Current institutional state</p>
              <p className="text-2xl font-semibold">{state}</p>
            </div>
            <p className="text-xs text-text-muted">{commands.length} command{commands.length === 1 ? "" : "s"} on record · click any to inspect</p>
          </div>
          {commands.length === 0 && <EmptyState title="No emergency commands" description="The command plane is at rest." />}
          <div className="space-y-2">
            {commands.map((c) => (
              <article
                key={c.id}
                className="surface-card p-4 cursor-pointer hover:bg-bg-surface/60 transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => setActive(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActive(c);
                }}
              >
                <header className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-text-primary">{c.state}</h2>
                  <span className={"rounded px-1.5 py-0.5 text-[10px] font-medium " + (STATE_COLOR[c.state] ?? "bg-surface-1")}>{c.review_status}</span>
                </header>
                <p className="mt-1 text-xs text-text-muted">{c.reason}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {c.actor_role} · {new Date(c.created_at).toLocaleString()}
                  {c.scopes.length ? ` · ${c.scopes.join(", ")}` : ""}
                </p>
              </article>
            ))}
          </div>
        </>
      )}

      <EntityInspector inspection={inspection} onClose={() => setActive(null)} />
    </div>
  );
}
