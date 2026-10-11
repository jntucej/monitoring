// src/components/shared/ChartTypeSwitcher.tsx
// SCAFFOLD:CHART — 8-type toggle. Idempotent: regenerate with --force.
"use client";

import React from "react";
import {
  LineChart as LineChartIcon, BarChart3, PieChart as PieChartIcon,
  Radar as RadarIcon, ScatterChart as ScatterIcon, AreaChart as AreaChartIcon,
  Gauge, Layers,
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

export function ChartTypeSwitcher({
  value, onChange, compact = false,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-1">
      {CHART_TYPE_OPTIONS.map((c) => {
        const Icon = c.icon;
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            title={c.label}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? "bg-emerald-500/15 text-emerald-500 shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span>{c.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default ChartTypeSwitcher;
