"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { RequestTimeline } from "@/components/shared/RequestTimeline";
import {
  ClipboardList, Plus, Inbox, AlertCircle, Loader2, ArrowRight,
} from "lucide-react";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
import type { PermissionItem } from "@/components/approver/PermissionRow";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

function StudentRequestTrackingInner() {
  const user = useAuthStore((s) => s.user);
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

  usePolling(fetchTickets, { intervalMs: 30_000, enabled: !!user });

  const filtered = filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="w-5 h-5 text-[var(--action-primary)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Request Tracking</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { clearCache(); void fetchTickets(); }}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Refresh
          </button>
          <Link
            href="/student/pass-application"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--action-primary)] px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus className="w-3.5 h-3.5" /> New Request
          </Link>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-[var(--action-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)]"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-12 text-center space-y-3 min-w-0">
          <Inbox className="w-10 h-10 text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {filter === "ALL" ? "No requests yet" : `No ${filter.toLowerCase()} requests`}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">
              Submit a gate pass or leave request and it will appear here with a full timeline.
            </p>
          </div>
          <Link
            href="/student/pass-application"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-xs font-bold text-white"
          >
            New Request <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div key={ticket.id || ticket.ticket_number}>
              <PermissionTicketCard
                ticket={ticket}
                onSelect={(tn) => setActiveTicket(tn)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Request timeline for selected ticket */}
      {activeTicket && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-w-0">
          <p className="text-xs font-bold text-[var(--text-secondary)] mb-3">
            Timeline · <span className="font-mono text-[var(--text-muted)]">{activeTicket}</span>
          </p>
          <RequestTimeline ticket={activeTicket} compact />
        </div>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function StudentRequestTrackingPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StudentRequestTrackingInner />
    </Suspense>
  );
}
