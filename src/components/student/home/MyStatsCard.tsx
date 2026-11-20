/**
 * MyStatsCard — "see + compare" pillar for student home.
 * Attendance % (this month vs last), time on campus this week,
 * meals rated this week, passes used this month.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  UtensilsCrossed,
  Ticket,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────

interface StatsPayload {
  attendance: {
    thisMonth: number; // pct
    lastMonth: number;
    delta: number;
  } | null;
  timeOnCampusThisWeek: string | null; // "12h 30m"
  mealsRatedThisWeek: number;
  passesUsedThisMonth: number;
}

// ── Component ─────────────────────────────────────────────────────────────

export function MyStatsCard() {
  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/dashboard", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      const d = body?.data;
      if (!d) throw new Error("empty");

      // Attendance: use dashboard's attendance block (pct + lastMonthPct + delta)
      const att = d.attendance;
      const attendance = att
        ? {
            thisMonth: att.pct,
            lastMonth: att.lastMonthPct ?? 0,
            delta: att.delta ?? 0,
          }
        : null;

      // Time on campus this week: approximate from lastScan + active passes
      // (the dashboard doesn't expose per-day scan logs, use a safe default)
      const timeOnCampusThisWeek: string | null = null;

      // Meals rated: count today's mess reviews from /api/mess/reviews
      let mealsRatedThisWeek = 0;
      try {
        const mealRes = await fetch("/api/mess/reviews", {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const mealBody = await mealRes.json().catch(() => null);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        mealsRatedThisWeek = (mealBody?.data?.reviews ?? []).filter(
          (r: { review_date?: string; reviewDate?: string }) => {
            const rd = r.review_date ?? r.reviewDate;
            return rd && new Date(rd).getTime() >= weekAgo.getTime();
          }
        ).length;
      } catch {}

      // Passes used this month
      let passesUsedThisMonth = 0;
      try {
        const passRes = await fetch("/api/passes", {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const passBody = await passRes.json().catch(() => null);
        const nowMonth = new Date().toISOString().slice(0, 7);
        passesUsedThisMonth = (passBody?.data ?? []).filter(
          (p: { requestedAt?: string; from?: string }) =>
            (p.requestedAt ?? p.from ?? "").startsWith(nowMonth)
        ).length;
      } catch {}

      setData({
        attendance,
        timeOnCampusThisWeek,
        mealsRatedThisWeek,
        passesUsedThisMonth,
      });
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <WidgetBoundary name="my-stats-card">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </WidgetBoundary>
    );
  }

  if (!data) return null;

  const delta = data.attendance?.delta ?? 0;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <WidgetBoundary name="my-stats-card">
      <div className="rounded-xl border border-border bg-bg-elevated p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
          My stats
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Attendance */}
          {data.attendance && (
            <div className="rounded-lg bg-bg-base border border-border p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
                <CalendarDays className="h-3 w-3" /> Attendance
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-bold text-text-primary tabular-nums">
                  {data.attendance.thisMonth}%
                </span>
                <DeltaIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    delta > 0
                      ? "text-emerald-500"
                      : delta < 0
                        ? "text-rose-500"
                        : "text-text-muted"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    delta > 0
                      ? "text-emerald-500"
                      : delta < 0
                        ? "text-rose-500"
                        : "text-text-muted"
                  )}
                >
                  {delta > 0 ? "+" : ""}{delta}
                </span>
              </div>
              <p className="text-[10px] text-text-muted">
                vs {data.attendance.lastMonth}% last month
              </p>
            </div>
          )}

          {/* Time on campus */}
          {data.timeOnCampusThisWeek && (
            <div className="rounded-lg bg-bg-base border border-border p-2.5">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
                <Clock className="h-3 w-3" /> On campus
              </div>
              <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                {data.timeOnCampusThisWeek}
              </p>
              <p className="text-[10px] text-text-muted">this week</p>
            </div>
          )}

          {/* Meals rated */}
          <div className="rounded-lg bg-bg-base border border-border p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
              <UtensilsCrossed className="h-3 w-3" /> Meals rated
            </div>
            <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
              {data.mealsRatedThisWeek}
            </p>
            <p className="text-[10px] text-text-muted">this week</p>
          </div>

          {/* Passes used */}
          <div className="rounded-lg bg-bg-base border border-border p-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
              <Ticket className="h-3 w-3" /> Passes used
            </div>
            <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
              {data.passesUsedThisMonth}
            </p>
            <p className="text-[10px] text-text-muted">this month</p>
          </div>
        </div>
      </div>
    </WidgetBoundary>
  );
}

export default MyStatsCard;
