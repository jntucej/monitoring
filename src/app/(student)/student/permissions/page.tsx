export const dynamic = "force-dynamic";
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
 * My Permissions — the student's personal ticket list (Step 6). Fetches the
 * logged-in student's requests from `GET /api/permissions` (the API scopes to the
 * student automatically), renders each as a `PermissionTicketCard`, and opens the
 * shared `PermissionDetailPanel` on select. REJECTED tickets get a
 * "Reapply" link.
 */
export default function StudentPermissionsPage() {
  const api = useApi();

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

  usePolling(fetchTickets, { intervalMs: 30000 });
  useLiveRefresh(fetchTickets, { intervalMs: 30000 });

  const filtered =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[var(--action-primary)]" />
              <p className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">My Permissions</p>
            </div>
            <p className="text-xs md:text-sm text-[var(--text-muted)]">Track your requests and approvals</p>
          </div>
          <Link href="/student/permissions/new">
            <Button className="gap-2 bg-[var(--action-primary)] hover:opacity-90 text-white font-semibold">
              <Plus className="w-4 h-4" /> New Permission
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[color-mix(in_srgb,var(--action-danger)_12%,transparent)] border border-[var(--action-danger)]/30 text-[var(--action-danger)] text-xs md:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const count =
              f === "ALL" ? tickets.length : tickets.filter((t) => t.status === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  filter === f
                    ? "bg-[var(--action-primary)] text-white shadow"
                    : "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
          <div className="glass-card p-12 text-center space-y-3">
            <Inbox className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No permission requests found</p>
            <p className="text-xs text-[var(--text-muted)]">
              {filter === "ALL" ? "You haven't submitted any permission requests yet." : `No ${filter.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => {
              const ticketNum = t.ticket_number ?? t.id;
              return (
                <div key={t.id} className="glass-card p-4 space-y-3">
                  <PermissionTicketCard
                    ticket={t}
                    onSelect={(num) => setActiveTicket(num)}
                  />
                  {t.status === "REJECTED" && (
                    <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                      <Link
                        href={`/student/permissions/new?reapply=${encodeURIComponent(ticketNum)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-semibold hover:bg-amber-500/20 transition w-full sm:w-auto"
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
      </div>
    </AuthGuard>
  );
}
