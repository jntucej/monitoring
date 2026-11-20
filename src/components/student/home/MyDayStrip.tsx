/**
 * MyDayStrip — proactive "remind" pillar for student home.
 * Shows next class, meal cutoff, curfew countdown, and next event.
 * Compact horizontal strip; degrades silently when no data.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, UtensilsCrossed, Moon, Sparkles, MapPin, User, Bell } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────

interface DayStripPayload {
  nextClass: {
    subject: string;
    faculty: string;
    hall: string;
    start: string;
    end: string;
  } | null;
  nextMealCutoff: string | null; // "14:30"
  curfewIn: string | null; // "3h 15m"
  nextEvent: {
    title: string;
    when: string;
    location: string;
  } | null;
}

function parseHhmm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minutesFromNow(hhmm: string): number {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return parseHhmm(hhmm) - nowMin;
}

function formatCountdown(mins: number): string {
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

// ── Component ─────────────────────────────────────────────────────────────

export function MyDayStrip() {
  const [data, setData] = useState<DayStripPayload | null>(null);
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

      // next class from attendance.upcoming (first entry)
      const upcoming = d.attendance?.upcoming ?? [];
      const next = upcoming[0] ?? null;
      const nextClass = next
        ? {
            subject: next.subject ?? "Class",
            faculty: next.faculty ?? "",
            hall: "",
            start: next.timeIn ?? "",
            end: next.timeOut ?? "",
          }
        : null;

      // meal cutoff: next window end
      const nowH = new Date();
      const nowMin = nowH.getHours() * 60 + nowH.getMinutes();
      const mealWindows: Array<{ end: string }> = [
        { end: "09:30" },
        { end: "14:30" },
        { end: "21:30" },
      ];
      const nextMeal = mealWindows.find((m) => parseHhmm(m.end) > nowMin);
      const nextMealCutoff = nextMeal?.end ?? null;

      // curfew: use curfew.today score context (time-based)
      const curfewTime = "22:00"; // campus default curfew
      const curfewMins = parseHhmm(curfewTime) - nowMin;
      const curfewIn = curfewMins > 0 ? formatCountdown(curfewMins) : null;

      // next event: not in dashboard payload; null for now
      const nextEvent = null;

      setData({ nextClass, nextMealCutoff, curfewIn, nextEvent });
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <WidgetBoundary name="my-day-strip">
        <Skeleton className="h-14 rounded-xl" />
      </WidgetBoundary>
    );
  }

  const hasContent =
    data?.nextClass || data?.nextMealCutoff || data?.curfewIn || data?.nextEvent;
  if (!hasContent) return null;

  return (
    <WidgetBoundary name="my-day-strip">
      <div className="rounded-xl border border-border bg-bg-elevated p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1">
          <Bell className="h-3 w-3" /> My day
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Next class */}
          {data?.nextClass && (
            <div className="rounded-lg bg-bg-base border border-border p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-action-primary font-semibold">
                Next class
              </p>
              <p className="text-xs font-medium text-text-primary truncate">
                {data.nextClass.subject}
              </p>
              {data.nextClass.faculty && (
                <p className="text-[10px] text-text-muted flex items-center gap-1">
                  <User className="h-2.5 w-2.5" /> {data.nextClass.faculty}
                </p>
              )}
              <p className="text-[10px] text-text-muted flex items-center justify-between">
                {data.nextClass.hall ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {data.nextClass.hall}
                  </span>
                ) : <span />}
                <span className="tabular-nums">{data.nextClass.start}–{data.nextClass.end}</span>
              </p>
              {data.nextClass.start && minutesFromNow(data.nextClass.start) > 0 && (
                <p className="text-[10px] font-semibold text-action-success">
                  {formatCountdown(minutesFromNow(data.nextClass.start))}
                </p>
              )}
            </div>
          )}

          {/* Meal cutoff */}
          {data?.nextMealCutoff && (
            <div className="rounded-lg bg-bg-base border border-border p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-amber-500 font-semibold flex items-center gap-1">
                <UtensilsCrossed className="h-3 w-3" /> Meal cutoff
              </p>
              <p className="text-xs font-medium text-text-primary tabular-nums">
                {data.nextMealCutoff}
              </p>
              {minutesFromNow(data.nextMealCutoff) > 0 && (
                <p className="text-[10px] font-semibold text-amber-600">
                  {formatCountdown(minutesFromNow(data.nextMealCutoff))}
                </p>
              )}
            </div>
          )}

          {/* Curfew */}
          {data?.curfewIn && (
            <div className="rounded-lg bg-bg-base border border-border p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-rose-500 font-semibold flex items-center gap-1">
                <Moon className="h-3 w-3" /> Curfew
              </p>
              <p className="text-xs font-medium text-text-primary">{data.curfewIn}</p>
            </div>
          )}

          {/* Next event */}
          {data?.nextEvent && (
            <div className="rounded-lg bg-bg-base border border-border p-2.5 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-sky-500 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Next event
              </p>
              <p className="text-xs font-medium text-text-primary truncate">
                {data.nextEvent.title}
              </p>
              <p className="text-[10px] text-text-muted">
                {data.nextEvent.when}
                {data.nextEvent.location && ` · ${data.nextEvent.location}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </WidgetBoundary>
  );
}

export default MyDayStrip;
