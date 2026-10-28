"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Tabs } from "@/components/ui/tabs";
import { DecisionCard, PrincipalShell } from "../_shared";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { Role } from "@/lib/types";

type TabKey = "mine" | "escalated" | "overdue" | "delegated" | "all";

const TABS: { id: TabKey; label: string; query: string }[] = [
  { id: "mine",      label: "Mine",       query: "scope=mine&status=PENDING" },
  { id: "escalated", label: "Escalated",  query: "status=ESCALATED" },
  { id: "overdue",   label: "Overdue",    query: "status=PENDING&overdue=1" },
  { id: "delegated", label: "Delegated",  query: "scope=delegated" },
  { id: "all",       label: "All",        query: "scope=all&limit=100" },
];

function Inner() {
  const params = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "mine";
  const [tab, setTab] = useState<TabKey>(initial);

  const active = TABS.find((t) => t.id === tab)!;
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
      <Tabs
        tabs={TABS.map(({ id, label }) => ({ id, label }))}
        activeTab={tab}
        onChange={(t) => setTab(t as TabKey)}
      />
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

import { redirect } from "next/navigation";

export default function PrincipalApprovalsPage() {
  redirect("/principal/approvals/mine");
}

