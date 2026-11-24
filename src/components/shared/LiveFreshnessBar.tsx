"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export interface LiveFreshnessBarProps {
  lastUpdatedAt: number | null;
  loading?: boolean;
  pollingActive?: boolean;
  activeFilters?: Array<{ key: string; label: string }>;
  onClearFilters?: () => void;
  onRefresh: () => void;
}

function formatAgo(ts: number | null, now: number): string {
  if (!ts) return "Not yet synced";
  const secs = Math.max(0, Math.round((now - ts) / 1000));
  if (secs < 5) return "Updated just now";
  if (secs < 60) return `Updated ${secs}s ago`;
  const mins = Math.round(secs / 60);
  return `Updated ${mins}m ago`;
}

/**
 * LiveFreshnessBar — polling, manual refresh & filter-reset strip showing:
 * - Last updated relative time ("Updated 12s ago")
 * - Live/paused polling indicator
 * - Active filter chips + one-click "Clear filters"
 * - "Refresh now" button
 */
export function LiveFreshnessBar({
  lastUpdatedAt,
  loading = false,
  pollingActive = true,
  activeFilters = [],
  onClearFilters,
  onRefresh,
}: LiveFreshnessBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${
              pollingActive ? "bg-action-success" : "bg-text-muted"
            }`}
            aria-hidden="true"
          />
          <span>{pollingActive ? "Live" : "Paused"}</span>
          <span>·</span>
          <span>{formatAgo(lastUpdatedAt, now)}</span>
        </span>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="rounded-full bg-bg-elevated px-2 py-0.5 text-text-secondary"
              >
                {f.label}
              </span>
            ))}
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="min-h-11 inline-flex items-center gap-1 px-2 font-semibold text-action-primary underline"
              >
                <X className="size-3" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="min-h-11 inline-flex items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        Refresh now
      </button>
    </div>
  );
}

export default LiveFreshnessBar;
