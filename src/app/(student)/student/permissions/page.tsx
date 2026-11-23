"use client";
import { POLL_INTERVALS } from "@/config/app-constants";

import React, { useState, useCallback } from "react";
import { ClipboardList, Plus, Inbox, AlertCircle, Search } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { usePolling } from "@/hooks/usePolling";
import {
  useEntityInspector,
  EntityInspectorPanel,
} from "@/components/shared/useEntityInspector";
import {
  KVPairs,
  Timeline,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/**
 * Build an EntityInspection model for a permission ticket (student view).
 * Sections: overview → stage history → actions (only the student's own actions).
 */
function buildPermissionInspection(t: PermissionItem): EntityInspection {
  const ticketNum = t.ticket_number ?? t.id;
  const statusTone: "ok" | "warn" | "danger" | "neutral" =
    t.status === "APPROVED" || t.status === "COMPLETED" ? "ok"
    : t.status === "REJECTED" || t.status === "CANCELLED" ? "danger"
    : t.status === "PENDING" ? "warn"
    : "neutral";

  const historyItems = (t.stage_history ?? []).map((h) => ({
    label: `${h.actorName} ${h.action.toLowerCase()}`,
    time: h.timestamp ? new Date(h.timestamp).toLocaleString() : undefined,
    detail: h.comment ?? undefined,
    tone: h.action === "FORWARDED" ? ("warn" as const) : ("neutral" as const),
  }));

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Workflow", value: (t.workflow_type ?? "").replace(/_/g, " ") },
            { label: "Current stage", value: t.current_stage?.replace(/_/g, " ") ?? "—" },
            { label: "Reason", value: t.reason ?? "—" },
            { label: "Created", value: t.created_at ? new Date(t.created_at).toLocaleString() : "—" },
            { label: "SLA deadline", value: t.sla_deadline ? new Date(t.sla_deadline).toLocaleString() : "—" },
          ]}
        />
      ),
    },
  ];

  if (historyItems.length > 0) {
    sections.push({
      title: "Stage history",
      collapsible: true,
      content: <Timeline items={historyItems} />,
    });
  }

  // Student can only view and reapply; cannot approve/reject
  sections.push({
    title: "Actions",
    content: (
      <ActionRow>
        <InspectorButton
          onClick={() => { /* trigger detail panel via onSelect */ }}
          variant="primary"
        >
          View details
        </InspectorButton>
        {t.status === "REJECTED" && (
          <InspectorButton
            href={`/student/permissions/new?reapply=${encodeURIComponent(ticketNum)}`}
            variant="ghost"
          >
            Reapply
          </InspectorButton>
        )}
      </ActionRow>
    ),
  });

  return {
    kind: "permission_ticket",
    title: ticketNum,
    subtitle: `${t.workflow_type ?? ""} · ${t.current_stage ?? ""}`.trim() || null,
    status: <StatusBadge text={t.status ?? "PENDING"} tone={statusTone} />,
    sections,
    detailHref: `/student/permissions?focus=${encodeURIComponent(ticketNum)}`,
    detailLabel: "Full ticket view",
  };
}


type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

/**
 * My Permissions — the student's personal ticket list (Step 6). Fetches the
 * logged-in student's requests from `GET /api/permissions` (the API scopes to the
 * student automatically), renders each as a `PermissionTicketCard`, and opens the
 * shared `PermissionDetailPanel` on select. REJECTED tickets get a
 * "Reapply" link.
 */
export default function StudentPermissionsPage() {
  const api = useApi();
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const [tickets, setTickets] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [activeTicket, setActiveTicket] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions", { headers: api.getHeaders(), cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (json.success && Array.isArray(json.data)) {
        setTickets(json.data);
        setError(null);
      } else {
        setError(json.error?.message || "Failed to load your permission requests.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [api]);

  usePolling(fetchTickets, { intervalMs: POLL_INTERVALS.normal });
  useLiveRefresh(fetchTickets, { intervalMs: POLL_INTERVALS.normal });

  const filtered =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-action-primary" />
              <p className="text-xl md:text-2xl font-bold text-text-primary">My Permissions</p>
            </div>
            <p className="text-xs md:text-sm text-text-muted">Track your requests and approvals</p>
          </div>
          <Link href="/student/permissions/new">
            <Button className="min-h11 gap-2 bg-action-primary hover:opacity-90 text-white font-semibold">
              <Plus className="w-4 h-4" /> New Permission
            </Button>
          </Link>
        </div>

        {error && (
          <div className="surface-card p-4 bg-[color-mix(in_srgb,var(--action-danger)_12%,transparent)] text-action-danger text-xs md:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pb-1">
          {FILTERS.map((f) => {
            const count =
              f === "ALL" ? tickets.length : tickets.filter((t) => t.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`min-h11 inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filter === f
                    ? "bg-action-primary text-white shadow"
                    : "bg-bg-surface border border-border text-text-muted hover:text-text-primary"
                }`}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>

        {loading && tickets.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card p-12 text-center space-y-3">
            <Inbox className="size-6 text-text-muted mx-auto" />
            <p className="text-sm font-semibold text-text-primary">No permission requests found</p>
            <p className="text-xs text-text-muted">
              {filter === "ALL" ? "You haven't submitted any permission requests yet." : `No ${filter.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => {
              const ticketNum = t.ticket_number ?? t.id;
              return (
                <div key={t.id} className="surface-card p-4 space-y-3">
                  <PermissionTicketCard
                    ticket={t}
                    onSelect={(num) => {
                      setActiveTicket(num);
                      const found = tickets.find((x) => (x.ticket_number ?? x.id) === num);
                      if (found) inspect(buildPermissionInspection(found));
                    }}
                  />
                  {t.status === "REJECTED" && (
                    <div className="surface-card pt-2 flex justify-end">
                      <Link
                        href={`/student/permissions/new?reapply=${encodeURIComponent(ticketNum)}`}
                        className="surface-card inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 text-action-warning text-xs font-semibold hover:bg-amber-500/20 transition w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Reapply (creates a new ticket)
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <PermissionDetailPanel
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
          onActionComplete={fetchTickets}
        />

        <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
      </div>
    </AuthGuard>
  );
}
