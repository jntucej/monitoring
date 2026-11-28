"use client";

import React, { useState } from "react";
import { displayId } from "@/lib/utils";

export interface ErpKpiItem {
  id: string;
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBg?: string; // e.g. "bg-purple-100 text-purple-700"
  hint?: string;
  onClick?: () => void;
}

export interface ExamPerformanceBarItem {
  label: string;
  val1: number; // percentage 0 - 100
  val2: number; // percentage 0 - 100
  val1Label?: string;
  val2Label?: string;
}

export interface ExamPerformanceChartProps {
  title?: string;
  legend1?: string;
  legend2?: string;
  periods?: Array<{ id: string; label: string; items: ExamPerformanceBarItem[] }>;
  activePeriod?: string;
  onPeriodChange?: (periodId: string) => void;
  // Fallback single items if no periods provided
  items?: ExamPerformanceBarItem[];
}

export interface DonutBreakdownProps {
  title?: string;
  badge?: string;
  totalLabel?: string;
  totalValue?: string | number;
  segments: Array<{
    label: string;
    percentage: number;
    color: string; // Tailwind bg or hex
    dotColor?: string;
  }>;
}

export interface UpcomingEventItem {
  id: string;
  dateStr: string;
  title: string;
  subtitle: string;
  accentBg?: string; // e.g. "bg-sky-50/80 border-sky-100 text-sky-700"
  onClick?: () => void;
}

export interface RecentActivityItem {
  id: string;
  dotColor?: string;
  title: string;
  timeAgo: string;
  ticketNumber?: string;
  onClick?: () => void;
}

export interface ExecutiveErpOverviewProps {
  title?: string;
  subtitle?: string;
  kpis: ErpKpiItem[];
  examChart?: ExamPerformanceChartProps;
  donut?: DonutBreakdownProps;
  events?: UpcomingEventItem[];
  activities?: RecentActivityItem[];
  onInspect?: (item: { id: string; ticket?: string; type?: string; title?: string }) => void;
  calendarMonth?: string;
  activeCalendarDays?: number[];
  className?: string;
}

export function ExecutiveErpOverview({
  title = "Institutional Overview",
  subtitle = "Executive ERP & Operational Insights",
  kpis,
  examChart,
  donut,
  events,
  activities,
  onInspect,
  calendarMonth = "Current Term",
  activeCalendarDays = [3, 8, 15],
  className = "",
}: ExecutiveErpOverviewProps) {
  // Chart period state
  const periods = examChart?.periods;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    examChart?.activePeriod ?? (periods && periods.length > 0 ? periods[0].id : "term1")
  );

  const activeBars: ExamPerformanceBarItem[] = React.useMemo(() => {
    if (periods && periods.length > 0) {
      const found = periods.find((p) => p.id === selectedPeriod);
      if (found) return found.items;
    }
    return examChart?.items ?? [];
  }, [periods, selectedPeriod, examChart?.items]);

  return (
    <div
      className={`max-w-[1540px] mx-auto bg-white rounded-3xl shadow-sm border border-purple-100/80 overflow-hidden flex flex-col xl:flex-row min-w-0 ${className}`}
    >
      {/* Center 2-Column Main Workspace */}
      <div className="flex-1 p-5 sm:p-6 space-y-5 min-w-0 bg-[#F8F7FC]/50">
        {/* Workspace Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1E1B4B]">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        {/* 1. 4-Card KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              onClick={kpi.onClick}
              className={`bg-white p-4 rounded-2xl border border-purple-100/70 shadow-sm flex items-center justify-between ${
                kpi.onClick ? "cursor-pointer hover:border-purple-300 transition-colors" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500 font-medium truncate">{kpi.label}</div>
                <div className="text-lg font-bold text-[#1E1B4B] mt-0.5 truncate">{kpi.value}</div>
              </div>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ml-2 ${
                  kpi.iconBg ?? "bg-purple-100 text-purple-700"
                }`}
              >
                {kpi.icon ?? "📊"}
              </div>
            </div>
          ))}
        </div>

        {/* 2. Middle Row: Dual-Tone Performance Bar Chart */}
        {examChart && (
          <div className="bg-white p-4 rounded-2xl border border-purple-100/70 shadow-sm">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#1E1B4B]">
                  {examChart.title ?? "Performance & Academic Metrics"}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#1E1B4B]"></span>
                    {examChart.legend1 ?? "Metric A"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-pink-300"></span>
                    {examChart.legend2 ?? "Metric B"}
                  </span>
                </div>
              </div>

              {periods && periods.length > 0 && (
                <select
                  value={selectedPeriod}
                  aria-label="Performance period filter"
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    examChart.onPeriodChange?.(e.target.value);
                  }}
                  className="text-[11px] bg-purple-50 text-[#1E1B4B] font-medium px-2.5 py-1 rounded-lg border border-purple-100 focus:outline-none"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bars container */}
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
              {activeBars.map((bar, idx) => {
                const h1 = Math.max(4, Math.min(100, bar.val1));
                const h2 = Math.max(4, Math.min(100, bar.val2));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
                    <div className="flex items-end gap-1 h-32 w-full justify-center">
                      <div
                        style={{ height: `${h1}%` }}
                        title={bar.val1Label ?? `${bar.val1}%`}
                        className="w-2.5 sm:w-3 rounded-t-md bg-[#1E1B4B] transition-all duration-300"
                      />
                      <div
                        style={{ height: `${h2}%` }}
                        title={bar.val2Label ?? `${bar.val2}%`}
                        className="w-2.5 sm:w-3 rounded-t-md bg-pink-300 transition-all duration-300"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Bottom Row: Donut Chart breakdown */}
        {donut && (
          <div className="bg-white p-4 rounded-2xl border border-purple-100/70 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#1E1B4B]">{donut.title ?? "Demographics & Scope"}</h3>
                {donut.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                    {donut.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Live campus distribution breakdown</p>
            </div>

            <div className="flex items-center gap-6">
              {/* SVG Donut */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f9a8d4" strokeWidth="4.2" />
                  {/* Primary segment */}
                  {donut.segments[0] && (
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#1E1B4B"
                      strokeWidth="4.2"
                      strokeDasharray={`${Math.max(0, Math.min(100, donut.segments[0].percentage))} 100`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute text-center">
                  <div className="text-sm font-bold text-[#1E1B4B]">{donut.totalValue ?? "—"}</div>
                  <div className="text-[9px] text-slate-500">{donut.totalLabel ?? "Total"}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-1.5 text-[11px]">
                {donut.segments.map((seg, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2 font-medium text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.dotColor ?? (sIdx === 0 ? "#1E1B4B" : "#f9a8d4") }}
                    />
                    <span>
                      {seg.label} ({Math.round(seg.percentage)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Rail: Mini Calendar, Upcoming Events, Recent Activity */}
      <aside className="w-full xl:w-72 bg-white border-t xl:border-t-0 xl:border-l border-purple-100/80 p-5 space-y-5 shrink-0">
        {/* Calendar Strip */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#1E1B4B]">{calendarMonth}</span>
            <div className="flex gap-1 text-slate-500 text-xs">
              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-[10px] font-medium text-purple-700">Live</span>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 mb-1.5 font-medium">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-600">
            <span className="text-slate-300">26</span>
            <span className="text-slate-300">27</span>
            <span className="text-slate-300">28</span>
            <span className="py-1">1</span>
            <span className="py-1">2</span>
            <span
              className={`py-1 ${
                activeCalendarDays.includes(3) ? "rounded-full bg-pink-200 text-[#1E1B4B] font-bold" : ""
              }`}
            >
              3
            </span>
            <span className="py-1">4</span>
            <span className="py-1">5</span>
            <span className="py-1">6</span>
            <span className="py-1">7</span>
            <span
              className={`py-1 ${
                activeCalendarDays.includes(8) ? "rounded-full bg-[#1E1B4B] text-white font-bold" : ""
              }`}
            >
              8
            </span>
            <span className="py-1">9</span>
            <span className="py-1">10</span>
            <span className="py-1">11</span>
            <span className="py-1">12</span>
            <span className="py-1">13</span>
            <span className="py-1">14</span>
            <span
              className={`py-1 ${
                activeCalendarDays.includes(15) ? "rounded-full bg-purple-100 text-purple-800 font-bold" : ""
              }`}
            >
              15
            </span>
            <span className="py-1">16</span>
            <span className="py-1">17</span>
            <span className="py-1">18</span>
          </div>
        </div>

        {/* Upcoming Events / Queue */}
        {events && events.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-[#1E1B4B] mb-2.5">Key Events & Milestones</h4>
            <div className="space-y-2.5">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (ev.onClick) ev.onClick();
                    else if (onInspect) onInspect({ id: ev.id, title: ev.title });
                  }}
                  className={`p-3 rounded-xl border transition-colors ${
                    ev.accentBg ?? "bg-sky-50/80 border-sky-100 text-sky-700"
                  } ${ev.onClick || onInspect ? "cursor-pointer hover:opacity-90" : ""}`}
                >
                  <div className="text-[10px] font-semibold">{ev.dateStr}</div>
                  <div className="text-xs font-bold text-[#1E1B4B] mt-0.5 truncate">{ev.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{ev.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity / Priority Inbound */}
        {activities && activities.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-[#1E1B4B] mb-2.5">Recent Activity</h4>
            <div className="space-y-3 text-xs">
              {activities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    if (act.onClick) act.onClick();
                    else if (onInspect)
                      onInspect({
                        id: act.id,
                        ticket: act.ticketNumber,
                        title: act.title,
                      });
                  }}
                  className={`flex items-start gap-2.5 ${
                    act.onClick || onInspect ? "cursor-pointer hover:bg-purple-50/50 p-1 rounded-lg transition" : ""
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${act.dotColor ?? "bg-purple-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-700 font-medium leading-snug break-words">
                      {act.title}
                    </p>
                    {act.ticketNumber && (
                      <span className="text-[10px] text-purple-700 font-mono block">
                        {displayId(act.ticketNumber)}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{act.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
