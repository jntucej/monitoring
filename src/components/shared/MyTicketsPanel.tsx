"use client";
// src/components/shared/MyTicketsPanel.tsx
// SCAFFOLD:TICKETS — self-service ticket list. Any role can use it.
//
// Idempotent — regenerate with scripts/scaffold-tickets.mjs new <f> --force
// to update the shared panel across every role.

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, Filter, Inbox, Loader2, Plus, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionTicketCard } from "@/components/student/PermissionTicketCard";
import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { TicketKpiStrip, type TicketCounts } from "./TicketKpiStrip";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePolling } from "@/hooks/usePolling";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"];

interface PermissionsResponse {
  success: boolean;
  data: PermissionItem[];
  total?: number;
}

interface CountsResponse {
  success: boolean;
  data: TicketCounts;
}

export interface MyTicketsPanelProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  newTicketHref?: string;
  canCreate?: boolean;
  /** Optional extra query params appended to /api/permissions?mine=true */
  extraQuery?: string;
  pollMs?: number;
}

export function MyTicketsPanel({
  title = "My Tickets",
  subtitle = "Permission requests you have raised",
  backHref,
  newTicketHref,
  canCreate = true,
  extraQuery = "",
  pollMs = 30_000,
}: MyTicketsPanelProps) {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [selected, setSelected] = useState<string | null>(null);

  const ticketsUrl = useMemo(
    () => `/api/permissions?mine=true${extraQuery ? `&${extraQuery}` : ""}`,
    [extraQuery],
  );

  const { data, loading, error, refresh, refreshKey } =
    useDashboardData<PermissionItem[]>(ticketsUrl, { ttlMs: 5_000, pollMs });

  const { data: countsData, refresh: refreshCounts } =
    useDashboardData<TicketCounts>("/api/permissions/my-counts", {
      ttlMs: 5_000,
      pollMs,
    });

  usePolling(
    useCallback(async () => { await refreshCounts(); }, [refreshCounts]),
    { intervalMs: pollMs, enabled: true },
  );

  const rows = data ?? [];
  const filtered = useMemo(
    () => (filter === "ALL" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="rounded-md p-1.5 hover:bg-[var(--bg-elevated)]"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <h1 className="text-fluid-lg font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-md p-2 hover:bg-[var(--bg-elevated)] disabled:opacity-50"
            aria-label="Refresh tickets"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
          </button>
          {canCreate && newTicketHref && (
            <Link
              href={newTicketHref}
              className="flex items-center gap-1.5 rounded-md bg-[var(--action-primary)] px-3 py-2 text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </Link>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <WidgetBoundary>
        <TicketKpiStrip
          counts={countsData ?? null}
          loading={!countsData && loading}
        />
      </WidgetBoundary>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              filter === f
                ? "bg-[var(--action-primary)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-[var(--action-danger)]/40 bg-[var(--action-danger)]/10 p-3 text-sm text-[var(--action-danger)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md bg-[var(--bg-elevated)] px-2 py-1 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && rows.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && !error && (
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title={filter === "ALL" ? "No tickets yet" : `No ${filter.toLowerCase()} tickets`}
          description={
            filter === "ALL"
              ? "When you raise a permission request it will appear here."
              : "Try a different status filter, or create a new ticket."
          }
          action={
            canCreate && newTicketHref ? (
              <Link
                href={newTicketHref}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--action-primary)] px-3 py-2 text-sm text-white"
              >
                <Plus className="h-4 w-4" />
                New Ticket
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Ticket list */}
      {filtered.length > 0 && (
        <WidgetBoundary key={refreshKey}>
          <div className="space-y-2">
            {filtered.map((t) => (
              <PermissionTicketCard
                key={t.id}
                ticket={t}
                onSelect={(n) => setSelected(n)}
              />
            ))}
          </div>
        </WidgetBoundary>
      )}

      {/* Detail panel */}
      <PermissionDetailPanel
        ticket={selected}
        onClose={() => setSelected(null)}
        onActionComplete={() => { void refresh(); void refreshCounts(); }}
      />
    </div>
  );
}
