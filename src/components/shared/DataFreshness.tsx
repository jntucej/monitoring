"use client";

import { useEffect, useState } from "react";

/**
 * DataFreshness — a small dot + "Updated Xs ago" indicator that signals
 * how fresh a data panel is. Used inside KpiCard footers and any panel
 * that tracks when its data was last fetched.
 *
 * The useFreshness hook below returns a derived status (live/stale/offline)
 * and a ready-to-render display string, so callers can just pass
 * `fetchTime` and use the result without re-deriving thresholds.
 */

export type FreshnessStatus = "live" | "stale" | "offline";

export interface DataFreshnessProps {
  /** When the data was last fetched. Accepts either a Date or an epoch-ms number. */
  timestamp: Date | number;
  /** Explicit status override. When omitted, derived from how old the timestamp is. */
  status?: FreshnessStatus;
  /** Start a 10-second interval to refresh the "Xs ago" display. */
  autoRefresh?: boolean;
  className?: string;
}

// Freshness thresholds (seconds since fetch).
const STALE_AFTER_SEC = 30;

export interface UseFreshnessResult {
  status: FreshnessStatus;
  /** A human-readable display string, e.g. "Updated 12s ago" or "Showing cached data". */
  display: string;
}

/**
 * Derives a freshness status + display string from a fetch-timestamp (ms since
 * epoch). Use inside a client component; the caller should pair this with a
 * ticking state (or the `autoRefresh` option on the <DataFreshness/> component)
 * to keep the "Xs ago" text current.
 */
export function useFreshness(fetchTime: number, offline?: boolean): UseFreshnessResult {
  const [now, setNow] = useState<number>(() => (typeof window !== "undefined" ? Date.now() : 0));

  // Ticker — keeps the "ago" text fresh without a forced interval at the call-site.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const status: FreshnessStatus = offline
    ? "offline"
    : now - fetchTime <= STALE_AFTER_SEC * 1000
      ? "live"
      : "stale";

  const display =
    status === "offline"
      ? "Showing cached data"
      : `Updated ${Math.max(0, Math.floor((now - fetchTime) / 1000))}s ago`;

  return { status, display };
}

const dotColor: Record<FreshnessStatus, string> = {
  live: "bg-emerald-500",
  stale: "bg-amber-500",
  offline: "bg-rose-500",
};

export function DataFreshness({
  timestamp,
  status: statusProp,
  autoRefresh,
  className,
}: DataFreshnessProps) {
  const fetchTime = typeof timestamp === "number" ? timestamp : timestamp.getTime();

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  const derived: FreshnessStatus =
    statusProp ?? (now - fetchTime <= STALE_AFTER_SEC * 1000 ? "live" : "stale");

  const display =
    derived === "offline"
      ? "Showing cached data"
      : `Updated ${Math.max(0, Math.floor((now - fetchTime) / 1000))}s ago`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] text-text-muted ${className ?? ""}`}
      role="status"
      aria-live={autoRefresh ? "polite" : undefined}
    >
      <span
        className={`inline-block size-1.5 rounded-full shrink-0 ${dotColor[derived]}`}
        aria-hidden="true"
      />
      <span>{display}</span>
    </span>
  );
}

export default DataFreshness;
