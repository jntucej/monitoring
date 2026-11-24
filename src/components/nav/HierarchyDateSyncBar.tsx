"use client";

import React from "react";
import Link from "next/link";
import { Calendar, RefreshCw, ArrowUpRight, Layers } from "lucide-react";
import {
  buildHierarchyDateSummary,
  type DateSyncSnapshot,
} from "@/lib/hierarchy-date-sync";

export function HierarchyDateSyncBar({
  role,
  snapshot,
  onDateChange,
  onRefreshSync,
  syncing = false,
}: {
  role: string | undefined;
  snapshot: DateSyncSnapshot;
  onDateChange: (nextDate: string) => void;
  onRefreshSync?: () => void;
  syncing?: boolean;
}) {
  const summary = buildHierarchyDateSummary(role, snapshot);

  return (
    <div
      data-testid="hierarchy-date-sync-bar"
      className="surface-card p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="inline-flex items-center gap-1.5 bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-text-primary">
          <Calendar className="h-3.5 w-3.5 text-action-primary" />
          <span className="text-text-muted">Date:</span>
          <input
            type="date"
            value={snapshot.date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="bg-transparent font-mono text-xs font-semibold text-text-primary focus:outline-none"
          />
        </label>

        {snapshot.presetApplied && (
          <span className="inline-flex items-center gap-1 bg-bg-elevated/60 px-2.5 py-1 text-xs font-medium text-text-primary">
            <Layers className="h-3 w-3 text-action-primary" />
            Preset: <strong>{snapshot.presetApplied}</strong>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-action-primary/10 px-3 py-1.5 font-semibold text-action-primary">
          {summary.headlineStat}
        </span>
        <span className="bg-bg-elevated px-3 py-1.5 text-text-muted">
          {summary.secondaryStat}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onRefreshSync && (
          <button
            type="button"
            disabled={syncing}
            onClick={onRefreshSync}
            className="inline-flex items-center gap-1.5 border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-surface disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        )}

        <Link
          href={summary.drilldownHref}
          className="inline-flex items-center gap-1 bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
        >
          <span>Inspect Date</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
