"use client";

import { Clock, Home, Moon } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface CurfewRow {
  ticket_number: string;
  name: string;
  roll: string;
  to_date: string;
  minutes: number;
}

export interface ReturnsTimelineData {
  upcoming: CurfewRow[];
  overdue: CurfewRow[];
  summary: { upcomingCount: number; overdueCount: number };
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
}

/**
 * HostelCurfewRow — single row showing a student's return status.
 */
export function HostelCurfewRow({ row, overdue }: { row: CurfewRow; overdue: boolean }) {
  return (
    <li
      className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
        overdue
          ? "bg-rose-500/10 border border-rose-500/20"
          : "bg-[var(--bg-elevated)] border border-[var(--border)]"
      }`}
    >
      {overdue ? (
        <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      ) : (
        <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      )}
      <span className="font-mono text-[var(--text-primary)] shrink-0">{row.ticket_number}</span>
      <span className="text-[var(--text-primary)] truncate flex-1">{row.name}</span>
      <span className="text-[var(--text-muted)] shrink-0">({row.roll})</span>
      <span
        className={`text-[10px] font-semibold shrink-0 ${
          overdue ? "text-rose-400" : "text-emerald-400"
        }`}
      >
        {overdue ? `Overdue ${fmtMinutes(row.minutes)}` : `Back in ${fmtMinutes(row.minutes)}`}
      </span>
    </li>
  );
}

/**
 * HostelCurfew — hostel curfew / returns-timeline board.
 * Fetches /api/hostel/returns-timeline.
 */
export function HostelCurfew() {
  const [data, setData] = useState<ReturnsTimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  usePolling(
    async () => {
      try {
        const res = await fetch("/api/hostel/returns-timeline");
        const json = await res.json();
        if (json.success) {
          setData(json.data as ReturnsTimelineData);
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    },
    { intervalMs: 30_000 },
  );

  return (
    <PrincipalWidgetBoundary title="Hostel Curfew & Returns">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Moon className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Students expected back / overdue
          </span>
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {!data && !error && (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-400 mb-2">
                Overdue ({data.summary.overdueCount})
              </h3>
              {data.overdue.length === 0 ? (
                <p className="text-xs text-emerald-400 py-1">All returns on time.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.overdue.slice(0, 10).map((r) => (
                    <HostelCurfewRow key={r.ticket_number} row={r} overdue />
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-2">
                Due Back Soon ({data.summary.upcomingCount})
              </h3>
              {data.upcoming.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-1">No returns scheduled in the next 6 hours.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.upcoming.slice(0, 10).map((r) => (
                    <HostelCurfewRow key={r.ticket_number} row={r} overdue={false} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}
