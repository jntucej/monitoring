"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Layers, ChevronDown } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SlaBadge } from "@/components/approver/SlaBadge";
import { SmartTextRef } from "@/components/nav/SmartTextRef";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

export interface ActionFirstApprovalsWorkspaceProps {
  items: PermissionItem[];
  role: string;
  currentPath: string;
  /** When true (e.g. Principal OVERDUE/ESCALATED slice), treat all PENDING/ESCALATED items in the slice as actionable. */
  treatAllPendingAsActionable?: boolean;
  onInspect: (item: PermissionItem) => void;
  onRefresh: () => void | Promise<void>;
  ledgerColumns: Column<PermissionItem>[];
  focusHref?: string;
}

function isSlaUrgent(item: PermissionItem): boolean {
  if (!item.sla_deadline) return false;
  const ms = new Date(item.sla_deadline).getTime() - Date.now();
  return ms <= 2 * 60 * 60 * 1000;
}

export function ActionFirstApprovalsWorkspace({
  items,
  role,
  currentPath,
  treatAllPendingAsActionable = false,
  onInspect,
  onRefresh,
  ledgerColumns,
  focusHref,
}: ActionFirstApprovalsWorkspaceProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [bandFilter, setBandFilter] = useState<"all" | "urgent">("all");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const normalizedRole = role.toLowerCase();
  const myTurnItems = items.filter((item) => {
    const st = (item.status ?? "").toUpperCase();
    if (treatAllPendingAsActionable) {
      return st === "PENDING" || st === "ESCALATED";
    }
    return (
      (st === "PENDING" || st === "ESCALATED") &&
      (item.current_stage ?? "").toLowerCase() === normalizedRole
    );
  });

  const myTurnIds = new Set(myTurnItems.map((i) => i.id));
  const backgroundLedger = items.filter((i) => !myTurnIds.has(i.id));
  const urgentItems = myTurnItems.filter(isSlaUrgent);
  const otherStageCount = backgroundLedger.filter(
    (i) => (i.status ?? "").toUpperCase() === "PENDING",
  ).length;
  const settledCount = backgroundLedger.filter(
    (i) => (i.status ?? "").toUpperCase() !== "PENDING",
  ).length;

  const visibleDeck = bandFilter === "urgent" ? urgentItems : myTurnItems;

  const runAction = async (
    ticketNumber: string,
    action: "APPROVE" | "REJECT" | "ESCALATE",
    reason?: string,
  ) => {
    setBusyKey(`${ticketNumber}:${action}`);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ action, ...(reason ? { reason, comment: reason } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        addToast({
          message: `${action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Escalated"} ${ticketNumber}`,
          variant: "success",
        });
        setRejectingId(null);
        setRejectNote("");
        await onRefresh();
      } else {
        addToast({
          message: json?.error?.message ?? `Failed to ${action.toLowerCase()} ${ticketNumber}`,
          variant: "error",
        });
      }
    } catch {
      addToast({ message: "Network error processing decision", variant: "error" });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-5" data-testid="action-first-workspace">
      {/* BAND 1: Live Pulse & Exception Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setBandFilter("all")}
          className={`surface-card p-3.5 text-left transition-colors ${
            bandFilter === "all" ? "ring-1 ring-action-primary" : "hover:bg-bg-elevated"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Awaiting Your Decision
          </p>
          <p className="mt-1 text-2xl font-semibold text-action-primary">{myTurnItems.length}</p>
        </button>

        <button
          type="button"
          onClick={() => setBandFilter(bandFilter === "urgent" ? "all" : "urgent")}
          className={`surface-card p-3.5 text-left transition-colors ${
            bandFilter === "urgent" ? "ring-1 ring-action-danger" : "hover:bg-bg-elevated"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted flex items-center gap-1">
            <AlertTriangle className="size-4 text-action-danger" />
            SLA At Risk
          </p>
          <p className={`mt-1 text-2xl font-semibold ${urgentItems.length > 0 ? "text-action-danger" : "text-text-primary"}`}>
            {urgentItems.length}
          </p>
        </button>

        <div className="surface-card p-3.5 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted flex items-center gap-1">
            <Clock className="size-4" />
            In Other Stages
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{otherStageCount}</p>
        </div>

        <div className="surface-card p-3.5 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted flex items-center gap-1">
            <Layers className="size-4" />
            Settled / Closed
          </p>
          <p className="mt-1 text-2xl font-semibold text-action-success">{settledCount}</p>
        </div>
      </div>

      {/* BAND 2: Role Action Deck ("Your Turn Now") */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {bandFilter === "urgent"
              ? `SLA At Risk (${visibleDeck.length})`
              : `Needs Your Action (${visibleDeck.length})`}
          </h2>
          {focusHref && myTurnItems.length > 0 && (
            <a
              href={focusHref}
              className="text-xs font-semibold text-action-primary hover:underline"
            >
              Enter Focus Mode &rarr;
            </a>
          )}
        </div>

        {visibleDeck.length === 0 ? (
          <div className="surface-card p-6 text-center space-y-1.5">
            <CheckCircle2 className="size-6 text-action-success mx-auto" />
            <p className="text-sm font-semibold text-text-primary">
              Queue clear — nothing waiting on your stage right now.
            </p>
            <p className="text-xs text-text-muted">
              {backgroundLedger.length > 0
                ? `${backgroundLedger.length} background or historical record${backgroundLedger.length === 1 ? "" : "s"} available in the ledger below.`
                : "All requests are up to date."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleDeck.map((ticket) => {
              const isRejecting = rejectingId === ticket.id;
              const roll = ticket.student?.student_details?.roll;
              return (
                <article
                  key={ticket.id}
                  className="surface-card bg-bg-surface p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onInspect(ticket)}
                          className="text-left text-sm font-semibold text-text-primary hover:text-action-primary hover:underline truncate block"
                        >
                          {ticket.student?.name ?? "Student"}
                          {roll ? ` (${roll})` : ""}
                        </button>
                        <p className="text-xs text-text-muted font-mono">
                          {ticket.ticket_number} · {ticket.workflow_type} · {ticket.current_stage}
                        </p>
                      </div>
                      <SlaBadge slaDeadline={ticket.sla_deadline ?? null} status={ticket.status} />
                    </div>

                    <p className="text-xs text-text-secondary line-clamp-2">
                      <SmartTextRef
                        text={ticket.reason ?? ticket.workflow_type}
                        currentPath={currentPath}
                      />
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => runAction(ticket.ticket_number, "APPROVE")}
                        className="bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                      >
                        {busyKey === `${ticket.ticket_number}:APPROVE` ? "Approving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => {
                          if (!isRejecting) {
                            setRejectingId(ticket.id);
                            return;
                          }
                          runAction(
                            ticket.ticket_number,
                            "REJECT",
                            rejectNote.trim() || `Rejected by ${role}`,
                          );
                        }}
                        className="bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-action-danger hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        {busyKey === `${ticket.ticket_number}:REJECT`
                          ? "Rejecting..."
                          : isRejecting
                          ? "Confirm Reject"
                          : "Reject"}
                      </button>
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => runAction(ticket.ticket_number, "ESCALATE")}
                        className="border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-surface disabled:opacity-50"
                      >
                        Escalate
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspect(ticket)}
                        className="ml-auto text-xs font-semibold text-action-primary hover:underline"
                      >
                        Inspect &rarr;
                      </button>
                    </div>

                    {isRejecting && (
                      <input
                        type="text"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Enter rejection reason..."
                        className="w-full border border-border bg-bg-base px-3 py-1.5 text-xs text-text-primary"
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* BAND 3: Collapsible Ledger (Raw DataTable demoted to secondary reference) */}
      <details className="surface-card bg-bg-surface/60 p-3" open={myTurnItems.length === 0 && backgroundLedger.length > 0}>
        <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-semibold text-text-secondary">
          <span>All Records &amp; Upstream/Downstream Ledger ({backgroundLedger.length})</span>
          <ChevronDown className="size-4 text-text-muted" />
        </summary>
        <div className="mt-3">
          <DataTable<PermissionItem>
            columns={ledgerColumns}
            data={backgroundLedger}
            keyExtractor={(r) => r.id}
            onRowClick={onInspect}
            emptyMessage="No background or historical records in this slice."
          />
        </div>
      </details>
    </div>
  );
}
