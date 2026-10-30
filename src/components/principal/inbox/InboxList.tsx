"use client";

import { useCallback, useState } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { InboxCard } from "./InboxCard";
import { InboxDetailSheet } from "./InboxDetailSheet";
import { InboxBatchBar } from "./InboxBatchBar";
import { useInboxData, useInboxBatch } from "./useInboxData";
import { filtersFromParams } from "./InboxFilters";
import type { InboxFilters } from "./useInboxData";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { clearCache } from "@/hooks/useApiResource";

export interface InboxListProps {
  title: string;
  description?: string;
  /** Fixed filters applied on top of URL params. */
  fixedFilters?: Partial<InboxFilters>;
}

/**
 * InboxList — the full inbox list: filters + cards + batch bar + detail sheet.
 * Used by inbox/page.tsx, overdue/, delegated/, escalated/, manage-approved/.
 */
export function InboxList({ title, description, fixedFilters }: InboxListProps) {
  const searchParams = useSearchParams();
  const activeFilters: InboxFilters = {
    ...filtersFromParams(searchParams),
    ...fixedFilters,
  };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTicket, setActiveTicket] = useState<string | null>(null);

  const { tickets, loading, error, refresh, total } = useInboxData(activeFilters);
  const { run: batchRun, busy, result } = useInboxBatch();

  const handleToggleSelect = useCallback((ticket: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticket)) next.delete(ticket);
      else next.add(ticket);
      return next;
    });
  }, []);

  const handleClear = useCallback(() => setSelected(new Set()), []);

  const handleBatchApprove = useCallback(async () => {
    if (selected.size === 0) return;
    await batchRun(Array.from(selected), "APPROVE");
    handleClear();
    clearCache();
  }, [selected, batchRun, handleClear]);

  const handleBatchReject = useCallback(async () => {
    if (selected.size === 0) return;
    await batchRun(Array.from(selected), "REJECT");
    handleClear();
    clearCache();
  }, [selected, batchRun, handleClear]);

  return (
    <div className="space-y-4 min-w-0 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{title}</h1>
          {description && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
          )}
          {!loading && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1">{total} items</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { clearCache(); refresh(); }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && tickets.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && tickets.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-2">
          <Inbox className="w-8 h-8 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-secondary)]">No tickets match your filters.</p>
        </div>
      )}

      {/* Card list */}
      {!loading && tickets.length > 0 && (
        <div className="space-y-2.5">
          {tickets.map((ticket) => (
            <InboxCard
              key={ticket.id || ticket.ticket_number}
              ticket={ticket}
              onOpenDetail={setActiveTicket}
              selected={selected.has(ticket.ticket_number)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      )}

      {/* Batch bar */}
      <InboxBatchBar
        selectedCount={selected.size}
        onApprove={handleBatchApprove}
        onReject={handleBatchReject}
        onClear={handleClear}
        isLoading={busy}
        lastResult={result}
      />

      {/* Detail sheet */}
      <InboxDetailSheet
        ticket={activeTicket}
        onClose={() => setActiveTicket(null)}
        onActionComplete={() => {
          clearCache();
          refresh();
        }}
      />
    </div>
  );
}
