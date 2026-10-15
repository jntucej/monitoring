"use client";

import React, { useState, useCallback } from "react";
import { ClipboardList, Plus, Inbox, AlertCircle, ArrowUpRight, Check, X } from "lucide-react";
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
import { useUIStore } from "@/stores/uiStore";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

/**
 * Fixed escalation reasons a student may cite when asking a rejected ticket to
 * move to the next hostel level (TASK 5, 5.3).
 */
const ESCALATION_REASONS: readonly string[] = [
  "Warden unavailable",
  "Medical urgency",
  "Clerical error",
  "Family emergency",
];

/**
 * My Permissions — the student's personal ticket list (Step 6). Fetches the
 * logged-in student's requests from `GET /api/permissions` (the API scopes to the
 * student automatically), renders each as a `PermissionTicketCard`, and opens the
 * shared `PermissionDetailPanel` on select. REJECTED tickets get an
 * "Escalate to next level" action (TASK 5).
 */
export default function StudentPermissionsPage() {
const api = useApi();

  const [tickets, setTickets] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  // Escalate-to-next-level state: which ticket is being escalated + chosen reason.
  const [escalatingTicket, setEscalatingTicket] = useState<PermissionItem | null>(null);
  const [escalationReason, setEscalationReason] = useState<string>(ESCALATION_REASONS[0]);
  const [escalating, setEscalating] = useState(false);
  const [escalationError, setEscalationError] = useState<string | null>(null);

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
  }, []);

  // 30s polling via usePolling (visibility-aware); Live-toggle refetch via useLiveRefresh.
  usePolling(fetchTickets, { intervalMs: 30000 });
  useLiveRefresh(fetchTickets, { intervalMs: 30000 });

  const openEscalate = (ticket: PermissionItem) => {
    setEscalatingTicket(ticket);
    setEscalationReason(ESCALATION_REASONS[0]);
    setEscalationError(null);
    setEscalating(false);
  };

  const closeEscalate = () => {
    setEscalatingTicket(null);
    setEscalationError(null);
  };

  const submitEscalation = useCallback(async () => {
    if (!escalatingTicket) return;
    const ticketNumber = escalatingTicket.ticket_number;
    setEscalating(true);
    setEscalationError(null);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}`, {
        method: "PATCH",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ESCALATE_UP", comment: escalationReason }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        addToast({
          message: json.error?.message || "Escalation was not permitted.",
          variant: "error",
        });
        return;
      }
      if (json.success) {
        addToast({
          message: `Ticket ${ticketNumber} escalated to the next level`,
          variant: "success",
        });
        closeEscalate();
        await fetchTickets();
      } else {
        setEscalationError(json.error?.message || "Escalation was not accepted");
      }
    } catch (err: unknown) {
      setEscalationError(err instanceof Error ? err.message : "Network error");
    } finally {
      setEscalating(false);
    }
  }, [escalatingTicket, escalationReason, api, addToast, fetchTickets]);

  const filtered =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Page toolbar — global DynamicHeader renders the app header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[var(--action-primary)]" />
              <p className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">My Permissions</p>
            </div>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">Track your requests and approvals</p>
          </div>
          <Link
            href="/student/permissions/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--action-primary)] text-white text-xs font-bold shadow-md hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" />
            New Request
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-surface)]"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error banner */}
        {!loading && error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-500 font-medium">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl text-center space-y-3">
            <Inbox className="w-10 h-10 text-[var(--text-muted)]" />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {filter === "ALL" ? "No permission requests yet" : `No ${filter.toLowerCase()} requests`}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm">
                {filter === "ALL"
                  ? "You haven't raised any permission requests. Create one to get started."
                  : "Try another filter or create a new request."}
              </p>
            </div>
            <Link
              href="/student/permissions/new"
              className="px-5 py-2.5 rounded-xl bg-[var(--action-primary)] text-white text-xs font-bold shadow-md hover:brightness-110 transition"
            >
              + New Request
            </Link>
          </div>
        )}

        {/* Ticket list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((ticket) => (
              <div key={ticket.id || ticket.ticket_number} className="space-y-2">
                <PermissionTicketCard
                  ticket={ticket}
                  onSelect={(tn) => setActiveTicket(tn)}
                />
                {ticket.status === "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => openEscalate(ticket)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition w-full sm:w-auto"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Escalate to next level
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Detail panel (shared with approver side) */}
        {activeTicket && (
          <PermissionDetailPanel
            ticket={activeTicket}
            onClose={() => setActiveTicket(null)}
            onActionComplete={fetchTickets}
          />
        )}

        {/* Escalation reason picker (TASK 5, 5.3) */}
        {escalatingTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    Escalate to next level
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Ticket {escalatingTicket.ticket_number}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEscalate}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Choose why this rejected request should move to the next approval level.
              </p>

              <div className="space-y-2">
                {ESCALATION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setEscalationReason(reason)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      escalationReason === reason
                        ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                        : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                    }`}
                  >
                    <span>{reason}</span>
                    {escalationReason === reason && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              {escalationError && (
                <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                  {escalationError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={closeEscalate} disabled={escalating}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={submitEscalation} loading={escalating} disabled={escalating}>
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                  Escalate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
