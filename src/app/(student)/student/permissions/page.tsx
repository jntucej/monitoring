"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ClipboardList, Plus, Inbox, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

/**
 * My Permissions — the student's personal ticket list (Step 6). Fetches the
 * logged-in student's requests from `GET /api/permissions` (the API scopes to the
 * student automatically), renders each as a `PermissionTicketCard`, and opens the
 * shared `PermissionDetailPanel` on select.
 */
export default function StudentPermissionsPage() {
  const [tickets, setTickets] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [activeTicket, setActiveTicket] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions", { headers: getAuthHeaders(), cache: "no-store" });
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

  // Initial load + 30s polling (always on); Live-toggle refetch via useLiveRefresh.
  // `fetchTickets` awaits its first setState, so nothing runs synchronously here.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await fetchTickets();
      if (cancelled) return;
    };
    void load();
    const id = setInterval(() => {
      void load();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchTickets]);
  useLiveRefresh(fetchTickets, { intervalMs: 30000 });

  const filtered =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[var(--action-primary)]" />
              <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">My Permissions</h1>
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
        </header>

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
              <PermissionTicketCard
                key={ticket.id || ticket.ticket_number}
                ticket={ticket}
                onSelect={(tn) => setActiveTicket(tn)}
              />
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
      </div>
    </AuthGuard>
  );
}

