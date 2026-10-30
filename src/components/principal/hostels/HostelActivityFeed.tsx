"use client";

import { Activity, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface ActivityEvent {
  id: string;
  type: "entry" | "exit";
  timestamp: string;
  gate_name?: string;
  student_name?: string;
  student_roll?: string;
}

/**
 * HostelActivityFeed — gate logs filtered for hostel-related movement.
 * Uses /api/gate/logs with direction filter. Falls back to empty state if no route.
 */
export function HostelActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/gate/logs?limit=20&direction=IN");
      const json = await res.json();
      if (json.success) {
        setEvents(
          (json.data?.logs ?? []).map((l: any) => ({
            id: l.id,
            type: l.direction === "OUT" ? "exit" : "entry",
            timestamp: l.timestamp,
            gate_name: l.gate_name,
            student_name: l.student_name || l.name,
            student_roll: l.student_roll || l.roll,
          })),
        );
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, { intervalMs: 30_000 });

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <PrincipalWidgetBoundary title="Hostel Activity Feed">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Recent Gate Activity (Hostel)
          </span>
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {loading && events.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">
            No recent hostel movement logged.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 text-xs p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]"
              >
                {e.type === "entry" ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="text-[var(--text-primary)] font-medium flex-1 min-w-0 truncate">
                  {e.student_name || "—"}
                  {e.student_roll && <span className="font-mono text-[var(--text-muted)] ml-1">({e.student_roll})</span>}
                </span>
                {e.gate_name && (
                  <span className="text-[var(--text-muted)] truncate hidden sm:block">{e.gate_name}</span>
                )}
                <span className="text-[var(--text-muted)] font-mono shrink-0">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {fmtTime(e.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}
