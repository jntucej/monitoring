"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Check,
  Bell,
} from "lucide-react";

/* ── shapes (mirror /api/campus-extra/calendar response) ── */

interface CalendarEvent {
  id: string;
  category: string;
  title: string;
  date: string;
  time?: string | null;
  location?: string | null;
  owner?: string | null;
}

interface CalendarCategory {
  id: string;
  code: string;
  label: string;
  color: string;
  icon?: string;
}

interface CalendarResponse {
  success: boolean;
  data: {
    events: CalendarEvent[];
    categories: CalendarCategory[];
    followedCategories: string[];
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  examination: "#8b5cf6",
  workshop: "#3b82f6",
  event: "#10b981",
  department: "#f59e0b",
  hostel: "#06b6d4",
  staff_duty: "#ef4444",
  maintenance: "#84cc16",
  admin_deadline: "#ec4899",
};

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

/* ── main ── */

function VisitScheduleInner() {
  const [currentMonth, setCurrentMonth] = useState(monthKey(new Date()));
  const [view, setView] = useState<"list" | "month">("list");

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<CalendarResponse>(
    `/api/campus-extra/calendar?month=${encodeURIComponent(currentMonth)}`,
    {
      ttlMs: 60_000,
      deps: [currentMonth],
    }
  );

  const refreshAll = useCallback(() => refresh(), [refresh]);
  usePolling(refreshAll, { intervalMs: 60_000, enabled: true });

  const events: CalendarEvent[] = data?.data?.events ?? [];
  const categories: CalendarCategory[] = data?.data?.categories ?? [];
  const followed = data?.data?.followedCategories ?? [];

  const upcoming = useMemo(() => {
    const now = new Date().toISOString();
    return events
      .filter((e) => e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20);
  }, [events]);

  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(monthKey(d));
  };
  const nextMonth = () => {
    const d = new Date(currentMonth + "-01");
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(monthKey(d));
  };

  const toggleFollow = async (code: string, reminder: boolean) => {
    const headers = getAuthHeaders();
    await fetch(
      `/api/campus-extra/calendar?follow=${encodeURIComponent(code)}&reminder=${reminder}`,
      { method: "POST", headers }
    );
    await refresh();
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            Visit Schedule
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Planned campus events, deadlines and visits
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Could not load the campus calendar.
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
        {/* header row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {monthLabel}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              ({upcoming.length} upcoming)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors motion-reduce:transition-none"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors motion-reduce:transition-none"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === "list" ? "month" : "list")}
              className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors motion-reduce:transition-none"
            >
              {view === "list" ? "Month view" : "List view"}
            </button>
          </div>
        </div>

        {/* followed category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map((cat) => {
              const isFollowed = followed.includes(cat.code);
              return (
                <button
                  key={cat.code}
                  type="button"
                  onClick={() => void toggleFollow(cat.code, !isFollowed)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors motion-reduce:transition-none ${
                    isFollowed ? "" : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                  }`}
                  style={
                    isFollowed
                      ? {
                          backgroundColor: `${cat.color}25`,
                          borderColor: `${cat.color}50`,
                          color: cat.color,
                        }
                      : undefined
                  }
                >
                  {isFollowed ? <Check className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="py-10 flex items-center justify-center text-sm text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading campus calendar…
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-6 text-center">
            No upcoming campus events this month.
          </p>
        ) : view === "list" ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {upcoming.map((ev) => {
              const color = CATEGORY_COLORS[ev.category] ?? "#6b7280";
              const isFollowed = followed.includes(ev.category);
              return (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-base)]/40 p-3"
                >
                  <div
                    className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(ev.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {ev.time ? ` · ${ev.time}` : ""}
                      {ev.location ? ` · ${ev.location}` : ""}
                      {ev.owner ? ` · ${ev.owner}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleFollow(ev.category, !isFollowed)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors motion-reduce:transition-none shrink-0"
                    aria-label="Toggle reminder for this category"
                  >
                    {isFollowed ? (
                      <Bell className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          /* compact month-style grid of events by day */
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {groupedMonth(events).map(([day, dayEvents]) => (
              <div key={day}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1.5">
                  {new Date(day + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
                <div className="space-y-1.5">
                  {dayEvents.map((ev) => {
                    const color = CATEGORY_COLORS[ev.category] ?? "#6b7280";
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                        style={{
                          backgroundColor: `${color}15`,
                          color,
                        }}
                      >
                        <span className="truncate flex-1">{ev.title}</span>
                        {ev.time && <span className="shrink-0 opacity-70">{ev.time}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupedMonth(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const day = ev.date.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(ev);
    map.set(day, list);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function VisitSchedulePage() {
  return (
    <WidgetBoundary title="Visit Schedule">
      <Suspense fallback={<PageLoading />}>
        <VisitScheduleInner />
      </Suspense>
    </WidgetBoundary>
  );
}
