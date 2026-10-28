"use client";

import { useMemo, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { DecisionCard, PrincipalShell } from "../_shared";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";

type TabKey = "mine" | "escalated" | "overdue" | "delegated" | "all";

const TABS: { id: TabKey; label: string; query: string }[] = [
  { id: "mine",      label: "Mine",      query: "scope=mine&status=PENDING" },
  { id: "escalated", label: "Escalated", query: "status=ESCALATED" },
  { id: "overdue",   label: "Overdue",   query: "status=PENDING&overdue=1" },
  { id: "delegated", label: "Delegated", query: "scope=delegated" },
  { id: "all",       label: "All",       query: "scope=all&limit=100" },
];

export function ApprovalsPanel({ tab }: { tab: TabKey }) {
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const res = useApiResource<any>(
    `/api/permissions?${active.query}`,
    { deps: [tab], ttlMs: 15_000 }
  );
  usePolling(() => res.refresh(), { intervalMs: 30_000 });

  const rows = useMemo(() => res.data?.data ?? [], [res.data]);

  const act = async (ticket: string, action: "APPROVE" | "REJECT") => {
    await fetch(`/api/permissions/${ticket}`, {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    clearCache(`/api/permissions?${active.query}`);
    res.refresh();
  };

  return (
    <PrincipalShell title="Approvals" subtitle="Every decision that needs you">
      <WidgetBoundary title="Approvals">
        {res.loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing here" description="This queue is clear." />
        ) : (
          <div className="space-y-3">
            {rows.map((row: any) => (
              <DecisionCard
                key={row.id}
                ticket={row.ticket_number}
                title={row.student?.name ?? "Unknown"}
                subtitle={`${row.workflow_type} · ${row.current_stage}`}
                reason={row.reason}
                urgency={
                  row.sla_deadline && new Date(row.sla_deadline) < new Date()
                    ? "overdue"
                    : "due"
                }
                slaDeadline={row.sla_deadline}
                onApprove={() => act(row.ticket_number, "APPROVE")}
                onReject={() => act(row.ticket_number, "REJECT")}
                onOpen={() => (window.location.href = `/approver/permissions/${row.ticket_number}`)}
              />
            ))}
          </div>
        )}
      </WidgetBoundary>
    </PrincipalShell>
  );
}
