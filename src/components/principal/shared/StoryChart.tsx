"use client";

/* ── StoryChart ── */
/* A compact weekly-trend "story" behind a KPI. Thin wrapper over the shared
 * ChartRenderer (area, 7 points). No business logic — pure projection.
 * Composes the emerald/mint success accent so "improving" reads green.
 */

import { memo } from "react";
import {
  ChartRenderer,
  type SeriesDef,
} from "@/components/shared/ChartRenderer";

export function StoryChart({
  points,
  xKey = "day",
  valueKey = "value",
  label = "Last 7 days",
}: {
  /** 7 (or fewer) points, oldest → newest: [{ day: "Mon", value: 12 }, ...] */
  points: Array<Record<string, number | string>>;
  xKey?: string;
  valueKey?: string;
  label?: string;
}) {
  const series: SeriesDef[] = [
    { key: valueKey, label: label, color: "var(--action-success)" },
  ];

  return (
    <div className="surface-card bg-bg-surface p-4 flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      {points.length === 0 ? (
        <div className="h-[120px] flex items-center justify-center text-xs text-text-muted">
          No data yet
        </div>
      ) : (
        <ChartRenderer
          type="area"
          data={points}
          series={series}
          xKey={xKey}
          height={120}
        />
      )}
    </div>
  );
}

export default memo(StoryChart);
