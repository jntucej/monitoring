"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarHeatmapProps } from "./types";
import { heatColor, clamp01, VIZ_THEME } from "./theme";

const CELL = 12;
const GAP = 3;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDate(s: string): Date {
  // Parse as local date (avoid TZ shift from Date.UTC).
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoWeekday(d: Date): number {
  // Sunday = 0 … Saturday = 6 (matches getDay()).
  return d.getDay();
}

/** GitHub-style contribution calendar. Days are laid out on a Sunday-aligned
 *  week grid; each cell's fill = heatColor(value/max), zero = faint gray. */
export function CalendarHeatmap({ days, weeks, label, onDayClick, className }: CalendarHeatmapProps) {
  const max = useMemo(
    () => days.reduce((m, d) => Math.max(m, d.value), 0),
    [days],
  );

  // Build the Sunday-aligned grid. The first week starts on the Sunday on or
  // before the earliest day; columns advance weekly.
  const grid = useMemo(() => {
    const byDate = new Map<string, CalendarDay>();
    days.forEach((d) => byDate.set(d.date, d));

    const start = parseDate(days[0].date);
    if (days.length > 0) {
      const wd = isoWeekday(start);
      start.setDate(start.getDate() - wd); // back to Sunday
    }
    const weekCount = weeks ?? Math.max(1, Math.ceil(days.length / 7));
    const weeksArr: { week: number; cells: { key: string; day?: CalendarDay }[] }[] = [];
    for (let w = 0; w < weekCount; w++) {
      const cells: { key: string; day?: CalendarDay }[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const cur = new Date(start);
        cur.setDate(start.getDate() + w * 7 + dow);
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        cells.push({ key, day: byDate.get(key) });
      }
      weeksArr.push({ week: w, cells });
    }
    return weeksArr;
  }, [days, weeks]);

  const svgH = (7 * (CELL + GAP) + GAP).toFixed(0);
  const widthLabelX = 26;
  const gridW = grid.length * (CELL + GAP) + GAP;
  const svgW = widthLabelX + gridW + 6;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 text-[11px] font-medium" style={{ color: VIZ_THEME.muted }}>
        {label}
      </div>
      <svg
        role="img"
        aria-label={`${label}: ${days.length} days of activity`}
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height={Number(svgH)}
        preserveAspectRatio="xMinYMid meet"
        className="overflow-visible"
      >
        {/* day-of-week labels */}
        {DAY_LABELS.map((lbl, i) =>
          i % 2 === 0 ? (
            <text
              key={lbl}
              x={0}
              y={i * (CELL + GAP) + 8}
              fontSize={9}
              fill={VIZ_THEME.muted}
            >
              {lbl}
            </text>
          ) : null,
        )}
        {grid.map(({ week, cells }) =>
          cells.map(({ key, day }) => {
            const value = day?.value;
            const x = widthLabelX + week * (CELL + GAP);
            const y = isoWeekday(parseDate(key)) * (CELL + GAP);
            const fill =
              value == null
                ? "transparent"
                : value === 0
                  ? "var(--text-muted)"
                  : heatColor(max > 0 ? clamp01(value / max) : 0);
            const fillOpacity = value === 0 ? 0.25 : 1;
            const interactive = day != null && !!onDayClick;
            return (
              <g
                key={key}
                onClick={() => day && onDayClick?.(day.date, day.value)}
                style={{ cursor: interactive ? "pointer" : "default" }}
                role={interactive ? "button" : "img"}
                aria-label={day ? `${day.date}: ${day.value}` : `${key}: no data`}
                tabIndex={interactive ? 0 : -1}
                onKeyDown={(ev) => ev.key === "Enter" && day && onDayClick?.(day.date, day.value)}
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke="var(--border)"
                  strokeWidth={0.5}
                >
                  <title>{day ? `${day.date} · ${day.value}` : key}</title>
                </rect>
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
