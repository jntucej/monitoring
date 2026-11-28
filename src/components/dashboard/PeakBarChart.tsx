"use client";

import React, { useState } from "react";
import { Activity } from "lucide-react";

export interface HourlyPeakBar {
  hour: number;
  label: string;
  count: number;
  tag?: string;
  isPeak?: boolean;
}

export interface PeakBarChartProps {
  bars?: HourlyPeakBar[];
  selectedHour?: number;
  onSelectHour?: (hour: number) => void;
  timeframeLabel?: string;
}

export function PeakBarChart({
  bars = [],
  selectedHour: controlledHour,
  onSelectHour,
  timeframeLabel = "24h",
}: PeakBarChartProps) {
  const [internalHour, setInternalHour] = useState<number>(20); // 8 PM default
  const activeHour = controlledHour ?? internalHour;

  // Build 24h default profile if empty
  const hourlyData: HourlyPeakBar[] =
    bars.length === 24
      ? bars.map((b) => {
          const h = b.hour;
          let tag = b.tag;
          let isPeak = b.isPeak;
          if (!tag) {
            if (h >= 8 && h <= 10) {
              tag = "Morning Entry Peak";
              isPeak = true;
            } else if (h === 13) {
              tag = "Lunch Break Peak";
              isPeak = true;
            } else if (h >= 20 && h <= 21) {
              tag = "Curfew Peak";
              isPeak = true;
            } else if (h >= 0 && h <= 4) {
              tag = "Night Watch";
            } else {
              tag = "Normal Flow";
            }
          }
          return {
            ...b,
            tag,
            isPeak: isPeak ?? (h >= 8 && h <= 10 || h === 13 || (h >= 20 && h <= 21)),
          };
        })
      : Array.from({ length: 24 }, (_, h) => {
          let tag = "Normal Flow";
          let isPeak = false;
          if (h >= 8 && h <= 10) {
            tag = "Morning Entry Peak";
            isPeak = true;
          } else if (h === 13) {
            tag = "Lunch Break Peak";
            isPeak = true;
          } else if (h >= 20 && h <= 21) {
            tag = "Curfew Peak";
            isPeak = true;
          } else if (h >= 0 && h <= 4) {
            tag = "Night Watch";
          }
          return {
            hour: h,
            label: `${String(h).padStart(2, "0")}:00 – ${String((h + 1) % 24).padStart(2, "0")}:00`,
            count: 0,
            tag,
            isPeak,
          };
        });

  const maxVal = Math.max(...hourlyData.map((b) => b.count), 10);
  const niceMax = Math.ceil(maxVal / 100) * 100 || 100;

  const currentBar = hourlyData[activeHour] ?? hourlyData[0];
  const rawPct = ((activeHour + 0.5) / 24) * 100;
  const clampedTooltipLeft = Math.max(15, Math.min(85, rawPct));

  const handleSelect = (idx: number) => {
    setInternalHour(idx);
    onSelectHour?.(idx);
  };

  return (
    <div className="bento-card p-5 flex flex-col justify-between relative bg-white rounded-2xl border border-slate-200/80 shadow-xs h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-orange-50 text-[#FF6B2C] flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </span>
          <div>
            <h2 className="text-[14px] font-bold text-slate-900 leading-tight">
              Hourly Campus &amp; Gate Activity (24h)
            </h2>
            <p className="text-[11px] text-slate-500">
              Peak windows: 8–10 AM Entry · 1 PM Lunch · 8–9 PM Curfew
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF6B2C] border border-orange-100">
            Curfew &amp; Gate Peaks
          </span>
        </div>
      </div>

      {/* Chart Area with Floating Tooltip */}
      <div className="relative pt-14 pb-1">
        {/* Floating Tooltip */}
        {currentBar && (
          <div
            className="absolute top-0 z-20 pointer-events-none transition-all duration-150 ease-out"
            style={{ left: `${clampedTooltipLeft}%`, transform: "translateX(-50%)" }}
          >
            <div className="bg-white border border-slate-200 shadow-md rounded-2xl px-3.5 py-2 text-center min-w-[152px]">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[14px] font-extrabold text-slate-900 tabular-nums">
                  {currentBar.count.toLocaleString()} scans
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    currentBar.isPeak
                      ? "bg-orange-50 text-[#FF6B2C]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {currentBar.tag}
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                {currentBar.label} · {timeframeLabel}
              </div>
            </div>
            <div className="w-2.5 h-2.5 bg-white border-r border-b border-slate-200 rotate-45 mx-auto -mt-1.5" />
          </div>
        )}

        {/* Y-Axis + 24 Bars */}
        <div className="flex items-end gap-2.5 h-[205px]">
          {/* Y-Axis Labels */}
          <div className="flex flex-col justify-between h-full text-[10px] font-semibold text-slate-400 tabular-nums pr-1 pb-5 select-none">
            {[1, 0.75, 0.5, 0.25, 0].map((r) => (
              <span key={r}>{Math.round(niceMax * r).toLocaleString()}</span>
            ))}
          </div>

          <div className="flex-1 h-full relative flex flex-col justify-end">
            {/* Dashed Gridlines */}
            <div className="absolute inset-0 bottom-5 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-dashed border-slate-100 w-full" />
              <div className="border-b border-slate-100 w-full" />
            </div>

            {/* 24 Vertical Pill Bars */}
            <div
              className="relative z-10 grid gap-1 sm:gap-1.5 items-end h-[182px] w-full"
              style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
            >
              {hourlyData.map((b, idx) => {
                const pct = Math.max(8, Math.round((b.count / niceMax) * 100));
                const isActive = idx === activeHour;
                return (
                  <div
                    key={b.hour}
                    className="h-full flex items-end justify-center cursor-pointer group"
                    onMouseEnter={() => handleSelect(idx)}
                    onClick={() => handleSelect(idx)}
                  >
                    <div
                      className={`w-full max-w-[15px] rounded-full transition-all duration-300 ${
                        isActive
                          ? "shadow-sm"
                          : b.isPeak
                          ? "bg-amber-200 hover:bg-amber-300"
                          : "bg-slate-200 hover:bg-slate-300"
                      }`}
                      style={{
                        height: `${pct}%`,
                        background: isActive
                          ? "linear-gradient(180deg, #FF551A 0%, #FF844B 100%)"
                          : undefined,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 mt-2 px-0.5 tabular-nums select-none">
              <span>00h</span>
              <span>04h</span>
              <span>08h</span>
              <span>12h</span>
              <span>16h</span>
              <span>20h</span>
              <span>23h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
