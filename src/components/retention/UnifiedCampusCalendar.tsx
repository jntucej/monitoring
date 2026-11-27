"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Calendar as CalendarIcon,
  Check,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getAuthHeaders } from "@/lib/utils";
import {
  getUnifiedCalendar,
  type CalendarEvent,
  type CalendarCategories,
} from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CATEGORY_COLORS: Record<string, string> = {
  examination: "var(--unit-c)",
  workshop: "var(--action-primary)",
  event: "var(--action-success)",
  department: "var(--action-warning)",
  hostel: "var(--action-info)",
  staff_duty: "var(--action-danger)",
  maintenance: "var(--action-success)",
  admin_deadline: "var(--unit-c)",
};

function getMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function UnifiedCampusCalendar() {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(getMonthKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategories[]>([]);
  const [followedCategories, setFollowedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"month" | "list">("month");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getUnifiedCalendar(currentMonth, followedCategories);
      if (result.success) {
        setEvents(result.data.events);
        setCategories(result.data.categories);
        setFollowedCategories(result.data.followedCategories);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, followedCategories]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const toggleFollow = useCallback(
    async (categoryCode: string, reminder: boolean) => {
      if (!user) return;
      try {
        const headers = getAuthHeaders();
        await fetch(
          `/api/campus-extra/calendar?follow=${encodeURIComponent(
            categoryCode
          )}&reminder=${reminder}`,
          { method: "POST", headers }
        );
        // Refetch
        const result = await getUnifiedCalendar(currentMonth, followedCategories);
        if (result.success) {
          setFollowedCategories(result.data.followedCategories);
          setCategories(result.data.categories);
        }
      } catch {
        // Silently ignore
      }
    },
    [user, currentMonth, followedCategories]
  );

  // Build the month grid
  const [year, monthNum] = currentMonth.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1).getDay();
  const numDays = daysInMonth(year, monthNum);
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      const day = ev.date.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(ev);
    }
    return map;
  }, [events]);

  const cells: Array<{ day: number | null; dateStr: string; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: "", isCurrentMonth: false });
  }
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr, isCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateStr: "", isCurrentMonth: false });
  }

  const prevMonth = () => {
    const d = new Date(year, monthNum - 2, 1);
    setCurrentMonth(getMonthKey(d));
  };
  const nextMonth = () => {
    const d = new Date(year, monthNum, 1);
    setCurrentMonth(getMonthKey(d));
  };

  const isFollowed = (code: string) => followedCategories.includes(code);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <WidgetBoundary title="Unified Campus Calendar">
      <div className="surface-card bg-bg-elevated/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-action-primary" />
            <h3 className="text-sm font-medium text-text-primary">Campus Calendar</h3>
            <span className="text-xs text-text-muted">{monthLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="surface-card p-1 hover:bg-bg-elevated/50 text-text-muted transition-colors motion-reduce:transition-none"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="surface-card p-1 hover:bg-bg-elevated/50 text-text-muted transition-colors motion-reduce:transition-none"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === "month" ? "list" : "month")}
              className="surface-card px-2 py-1 text-xs text-text-muted hover:bg-bg-elevated/50 transition-colors motion-reduce:transition-none"
            >
              {view === "month" ? "List" : "Month"}
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((cat) => {
            const followed = isFollowed(cat.code);
            return (
              <button
                key={cat.code}
                type="button"
                onClick={() => toggleFollow(cat.code, true)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors motion-reduce:transition-none ${
                  followed
                    ? "text-white"
                    : "border border-border/50 text-text-muted hover:bg-bg-elevated/40"
                }`}
                style={
                  followed
                    ? {
                        backgroundColor: `${cat.color}30`,
                        borderColor: `${cat.color}60`,
                        color: cat.color,
                      }
                    : undefined
                }
              >
                {followed ? <Check className="size-3.5" /> : <Bell className="size-3.5" />}
                {cat.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded bg-bg-elevated/20" />
        ) : view === "month" ? (
          /* Month Grid */
          <div className="grid grid-cols-7 gap-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-xs text-text-muted py-1">
                {d}
              </div>
            ))}
            {cells.map((cell, i) => (
              <div
                key={i}
                onClick={() => {
                  if (cell.day && cell.dateStr) {
                    setSelectedDate(cell.dateStr);
                    setSelectedEvent(eventsByDay[cell.dateStr]?.[0] ?? null);
                  }
                }}
                className={`min-h-14 rounded border p-1 text-xs transition-colors ${
                  cell.day ? "cursor-pointer hover:border-action-primary/50" : ""
                } ${
                  selectedDate === cell.dateStr
                    ? "border-action-primary bg-action-primary/5"
                    : cell.isCurrentMonth
                      ? "border-border/50 bg-bg-elevated/30"
                      : "border-transparent"
                } ${
                  cell.day &&
                  eventsByDay[cell.dateStr]?.some((e) => e.followable)
                    ? "ring-1 ring-indigo-500/20"
                    : ""
                }`}
              >
                {cell.day && (
                  <div className="text-text-muted mb-0.5">{cell.day}</div>
                )}
                {cell.day &&
                  eventsByDay[cell.dateStr]
                    ?.slice(0, 3)
                    .map((ev, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(cell.dateStr);
                          setSelectedEvent(ev);
                        }}
                        className="surface-card block w-full text-left truncate px-1 py-0.5 text-xs mb-0.5 hover:opacity-90"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[ev.category] ?? "var(--text-muted)"}25`,
                          color: CATEGORY_COLORS[ev.category] ?? "var(--text-muted)",
                        }}
                        title={`${ev.title} — ${ev.owner ?? "Campus"}`}
                      >
                        {ev.title}
                      </button>
                    ))}
                {cell.day &&
                  eventsByDay[cell.dateStr] &&
                  eventsByDay[cell.dateStr].length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(cell.dateStr);
                        setSelectedEvent(eventsByDay[cell.dateStr]?.[0] ?? null);
                      }}
                      className="text-xs font-medium text-action-primary hover:underline"
                    >
                      +{eventsByDay[cell.dateStr]!.length - 3} more
                    </button>
                  )}
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-xs text-text-muted">No events for this month.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="surface-card flex items-start gap-3 bg-bg-elevated/30 p-3"
                >
                  <div
                    className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: CATEGORY_COLORS[ev.category] ?? "var(--text-muted)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-secondary truncate">{ev.title}</p>
                    <p className="text-xs text-text-muted">
                      {new Date(ev.date).toLocaleDateString()}
                      {ev.time ? ` · ${ev.time}` : ""}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleFollow(ev.category, !(ev.reminderOptin ?? false))
                    }
                    className="p-1 text-text-muted hover:text-text-secondary transition-colors motion-reduce:transition-none"
                    aria-label="Toggle reminder"
                  >
                    {ev.reminderOptin ? (
                      <Bell className="h-3.5 w-3.5 text-action-primary" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected Day / Event Detail Drawer */}
        {selectedDate && (
          <div className="mt-4 rounded-xl border border-border bg-bg-surface p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-text-primary">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {(eventsByDay[selectedDate] ?? []).length} event(s)
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedEvent(null);
                }}
                className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                aria-label="Close day details"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {(eventsByDay[selectedDate] ?? []).length === 0 ? (
              <p className="text-xs text-text-muted">No scheduled events on this date.</p>
            ) : (
              <div className="space-y-2">
                {(eventsByDay[selectedDate] ?? []).map((ev) => {
                  const isSel = selectedEvent?.id === ev.id;
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`cursor-pointer rounded-lg border p-2.5 text-xs transition-colors ${
                        isSel
                          ? "border-action-primary bg-action-primary/5"
                          : "border-border/60 bg-bg-elevated/30 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary">{ev.title}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[ev.category] ?? "var(--text-muted)"}25`,
                            color: CATEGORY_COLORS[ev.category] ?? "var(--text-muted)",
                          }}
                        >
                          {ev.category}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-text-muted">
                        {ev.time ? `${ev.time} · ` : ""}
                        {ev.location ? `${ev.location} · ` : ""}
                        {ev.owner ?? "Campus"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default UnifiedCampusCalendar;
