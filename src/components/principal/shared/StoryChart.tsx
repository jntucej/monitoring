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

  // Accessible text summary of the series (a chart needs a non-visual
  // representation). Honest: derived only from the points actually passed.
  const values = points
    .map((p) => Number(p[valueKey]))
    .filter((n) => Number.isFinite(n));
  const summary =
    values.length === 0
      ? "no numeric values"
      : (() => {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const latest = values[values.length - 1];
          return `range ${min} to ${max}, latest ${latest}.`;
        })();

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
        // Accessible representation: a chart is only screen-reader-meaningful
        // with a text description (the a11y rule for charts). The wrapper
        // announces it as a labelled image whose alt text summarizes the
        // series, so a non-sighted user gets the data, not a blank canvas.
        <div
          role="img"
          aria-label={`${label}: ${points.length}-point trend. ${summary}`}
        >
          <ChartRenderer
            type="area"
            data={points}
            series={series}
            xKey={xKey}
            height={120}
          />
        </div>
      )}
    </div>
  );
}

export default memo(StoryChart);
