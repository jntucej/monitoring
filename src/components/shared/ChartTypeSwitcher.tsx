// src/components/shared/ChartTypeSwitcher.tsx
// 8-type chart toggle. Idempotent: regenerate with --force.
"use client";

import React from "react";
import {
  LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon,
  Radar as RadarIcon, ScatterChart as ScatterIcon, AreaChart as AreaChartIcon,
  Gauge, Layers, ChevronDown,
} from "lucide-react";
import type { ChartType } from "./ChartRenderer";

export const CHART_TYPE_OPTIONS: { id: ChartType; label: string; icon: React.ElementType }[] = [
  { id: "line",     label: "Line",     icon: LineChartIcon },
  { id: "area",     label: "Area",     icon: AreaChartIcon },
  { id: "bar",      label: "Bar",      icon: BarChart3 },
  { id: "composed", label: "Composed", icon: Layers },
  { id: "radar",    label: "Radar",    icon: RadarIcon },
  { id: "scatter",  label: "Scatter",  icon: ScatterIcon },
  { id: "pie",      label: "Pie",      icon: PieChartIcon },
  { id: "radial",   label: "Radial",   icon: Gauge },
];

/**
 * Chart type switcher.
 *
 * - sm+ (>=640px): icon-button row (all 8 options).
 * - < sm: a compact native <select> so the 8 options never overflow a
 *   narrow (375px) viewport.
 */
export function ChartTypeSwitcher({
  value, onChange, compact = false,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
  compact?: boolean;
}) {
  const iconBtn = (opt: (typeof CHART_TYPE_OPTIONS)[number]) => {
    const Icon = opt.icon;
    const active = value === opt.id;
    return (
      <button
        key={opt.id}
        type="button"
        onClick={() => onChange(opt.id)}
        title={opt.label}
        aria-pressed={active}
        aria-label={opt.label}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
          active
            ? "bg-emerald-500/15 text-emerald-500 shadow-sm"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {!compact && <span>{opt.label}</span>}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {/* Compact select for narrow viewports (< sm) */}
      <div className="relative sm:hidden">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ChartType)}
          aria-label="Chart type"
          className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] py-1.5 pl-3 pr-8 text-xs font-medium text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
        >
          {CHART_TYPE_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
      </div>

      {/* Full icon-button row (sm+) */}
      <div className="hidden sm:flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-1">
        {CHART_TYPE_OPTIONS.map(iconBtn)}
      </div>
    </div>
  );
}

export default ChartTypeSwitcher;
