"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, BarChart3 } from "lucide-react";
import type { Scan } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

interface DayBar {
  day: string;        // "Mon"
  date: string;       // "2026-10-12"
  inCount: number;
  outCount: number;
  isToday: boolean;
}

interface ChildDailyCounts {
  roll: string;
  name: string;
  bars: DayBar[];
  totalIn: number;
  totalOut: number;
}

/**
 * Weekly infographics panel for the parent dashboard.
 *
 * For each linked child, fetches /api/persons/:roll/history?limit=70 and
 * aggregates the scans by day (IN vs OUT counts) over the last 7 days
 * (calendar days, not scan entries). Renders a compact bar chart per child.
 *
 * Only shown when at least one linked child has activity.
 */
export function ChildWeeklyActivity() {
  const [daily, setDaily] = useState<ChildDailyCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const authRaw = sessionStorage.getItem("gate-monitor-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const parentId = auth?.state?.user?.id ?? auth?.user?.id;
      if (!parentId) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/students?parentId=${parentId}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      const kids: Array<{ roll?: string; uniqueId?: string; name?: string; fullName?: string }> = Array.isArray(json.data) ? json.data : [];
      if (kids.length === 0) {
        setDaily([]);
        setLoading(false);
        return;
      }

      // Build the 7-day axis (most-recent day on the right).
      const days: DayBar[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({
          day: d.toLocaleDateString("en-IN", { weekday: "short" }),
          date: key,
          inCount: 0,
          outCount: 0,
          isToday: i === 0,
        });
      }
      const results = await Promise.all(
        kids.map(async (k) => {
          const roll = k.uniqueId || k.roll || "";
          if (!roll) return null;
          try {
            const r = await fetch(`/api/persons/${encodeURIComponent(roll)}/history?limit=70`, {
              headers: getAuthHeaders(),
              cache: "no-store",
            });
            const j = await r.json();
            const scans: Scan[] = Array.isArray(j?.data?.history) ? j.data.history : [];
            // Group scans by local calendar day (IST-ish: use the device's local tz)
            const byDay = new Map<string, { inCount: number; outCount: number }>();
            for (const s of scans) {
              if (!s.timestamp) continue;
              const d = new Date(s.timestamp);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const bucket = byDay.get(key) ?? { inCount: 0, outCount: 0 };
              if (s.direction === "IN") bucket.inCount += 1;
              else bucket.outCount += 1;
              byDay.set(key, bucket);
            }
            // Map into the 7-day axis
            const bars: DayBar[] = days.map((d) => {
              const bucket = byDay.get(d.date);
              return { ...d, inCount: bucket?.inCount ?? 0, outCount: bucket?.outCount ?? 0 };
            });
            const totalIn = bars.reduce((sum, b) => sum + b.inCount, 0);
            const totalOut = bars.reduce((sum, b) => sum + b.outCount, 0);
            return { roll, name: k.fullName || k.name || roll, bars, totalIn, totalOut };
          } catch {
            return null;
          }
        })
      );
      setDaily(results.filter((r): r is ChildDailyCounts => r !== null));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  // Initial load + visibility-aware polling (no raw setInterval)
  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, { intervalMs: 60_000 });

  // Nothing to render if there is no activity data at all.
  const hasData = daily.some((c) => c.totalIn > 0 || c.totalOut > 0);

  if (loading && !hasData) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading weekly activity…
      </div>
    );
  }
  if (!hasData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {daily.map((c) => {
        const maxCount = c.bars.reduce((m, b) => Math.max(m, b.inCount + b.outCount), 0);
        const heightPct = (n: number) => (maxCount ? Math.max(6, Math.round((n / maxCount) * 100)) : 0);
        return (
          <div key={c.roll} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                7-Day Gate Activity — {c.name}
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> In ({c.totalIn})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Out ({c.totalOut})
                </span>
              </div>
            </div>

            <div className="flex items-end gap-2 h-28">
              {c.bars.map((b) => {
                const total = b.inCount + b.outCount;
                return (
                  <div key={b.date} className="flex-1 flex flex-col items-center gap-1" title={`${b.date}: ${b.inCount} in / ${b.outCount} out`}>
                    <div className="text-[10px] text-[var(--text-muted)]">{total || ""}</div>
                    <div className="w-full flex flex-col justify-end" style={{ height: `${heightPct(total)}px` }}>
                      <div
                        className="w-full rounded-t bg-emerald-500/90"
                        style={{ height: `${Math.min(100, (b.inCount / Math.max(total, 1)) * 100)}%` }}
                      />
                      <div
                        className="w-full bg-rose-500/90"
                        style={{ height: `${Math.min(100, (b.outCount / Math.max(total, 1)) * 100)}%` }}
                      />
                    </div>
                    <div className={`text-[10px] ${b.isToday ? "text-emerald-500 font-semibold" : "text-[var(--text-muted)]"}`}>
                      {b.isToday ? "Today" : b.day}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              {c.totalIn + c.totalOut === 0
                ? "No gate activity recorded in the last 7 days."
                : `${c.totalIn + c.totalOut} gate events across the last 7 days.`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
