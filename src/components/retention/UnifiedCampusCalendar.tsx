"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Calendar as CalendarIcon,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementStore } from "@/stores/engagementStore";
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
  examination: "#8b5cf6",
  workshop: "#3b82f6",
  event: "#10b981",
  department: "#f59e0b",
  hostel: "#06b6d4",
  staff_duty: "#ef4444",
  maintenance: "#84cc16",
  admin_deadline: "#ec4899",
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
    load();
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

  return (
    <WidgetBoundary title="Unified Campus Calendar">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-slate-100">Campus Calendar</h3>
            <span className="text-xs text-slate-500">{monthLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-slate-700/50 text-slate-400 transition-colors motion-reduce:transition-none"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-slate-700/50 text-slate-400 transition-colors motion-reduce:transition-none"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView(view === "month" ? "list" : "month")}
              className="px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700/50 transition-colors motion-reduce:transition-none"
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
                    : "border border-slate-600/50 text-slate-400 hover:bg-slate-700/40"
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
                {followed ? <Check className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                {cat.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded bg-slate-700/20" />
        ) : view === "month" ? (
          /* Month Grid */
          <div className="grid grid-cols-7 gap-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-xs text-slate-500 py-1">
                {d}
              </div>
            ))}
            {cells.map((cell, i) => (
              <div
                key={i}
                className={`min-h-[3.5rem] rounded border p-1 text-xs ${
                  cell.isCurrentMonth
                    ? "border-slate-700/50 bg-slate-800/30"
                    : "border-transparent"
                } ${
                  cell.day &&
                  eventsByDay[cell.dateStr]?.some((e) => e.followable)
                    ? "ring-1 ring-indigo-500/20"
                    : ""
                }`}
              >
                {cell.day && (
                  <div className="text-slate-400 mb-0.5">{cell.day}</div>
                )}
                {cell.day &&
                  eventsByDay[cell.dateStr]
                    ?.slice(0, 3)
                    .map((ev, j) => (
                      <div
                        key={j}
                        className="truncate rounded px-1 py-0.5 text-[10px] mb-0.5"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[ev.category] ?? "#6b7280"}25`,
                          color: CATEGORY_COLORS[ev.category] ?? "#94a3b8",
                        }}
                        title={`${ev.title} — ${ev.owner ?? "Campus"}`}
                      >
                        {ev.title}
                      </div>
                    ))}
                {cell.day &&
                  eventsByDay[cell.dateStr] &&
                  eventsByDay[cell.dateStr].length > 3 && (
                    <div className="text-[10px] text-slate-500">
                      +{eventsByDay[cell.dateStr]!.length - 3} more
                    </div>
                  )}
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500">No events for this month.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/40 bg-slate-800/30 p-3"
                >
                  <div
                    className="mt-0.5 h-2 w-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: CATEGORY_COLORS[ev.category] ?? "#6b7280",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{ev.title}</p>
                    <p className="text-[10px] text-slate-500">
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
                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors motion-reduce:transition-none"
                    aria-label="Toggle reminder"
                  >
                    {ev.reminderOptin ? (
                      <Bell className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default UnifiedCampusCalendar;
