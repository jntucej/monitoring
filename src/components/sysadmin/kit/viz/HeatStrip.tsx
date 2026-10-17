"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { HeatCell, HeatStripProps } from "./types";
import { statusColor, heatColor, clamp01, VIZ_THEME } from "./theme";

/** Horizontal strip of small heat cells. Each cell's fill is driven by its
 *  explicit `status` (via statusColor) or, when absent, by value intensity
 *  (value / max via heatColor). Renders as a flex row of SVG rects. */
export function HeatStrip({ cells, maxCells, height = 20, label, onCellClick, className }: HeatStripProps) {
  const max = useMemo(
    () => cells.reduce((m, c) => Math.max(m, c.value), 0),
    [cells],
  );

  // Roll excess cells into the leading "…" cell when maxCells is set.
  const visible = useMemo<HeatCell[]>(() => {
    if (maxCells == null || cells.length <= maxCells) return cells;
    const head = cells.slice(0, maxCells - 1);
    const rolled = cells.slice(maxCells - 1);
    const rolledValue = rolled.reduce((s, c) => s + c.value, 0);
    head.push({
      value: rolledValue,
      label: `… ${rolled.length} more`,
      status: undefined,
      at: rolled[0]?.at,
    });
    return head;
  }, [cells, maxCells]);

  const cellW = 10;
  const gap = 2;
  const svgW = visible.length * (cellW + gap) + gap;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 text-[11px] font-medium" style={{ color: VIZ_THEME.muted }}>
        {label}
      </div>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${svgW} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        className={cn("overflow-visible")}
      >
        {visible.map((c, i) => {
          const hasStatus = c.status != null;
          const fill = hasStatus
            ? statusColor(c.status)
            : heatColor(max > 0 ? clamp01(c.value / max) : 0);
          const tooltip = [
            c.label,
            hasStatus ? c.status : `intensity ${c.value}`,
            c.at,
          ]
            .filter(Boolean)
            .join(" · ");
          const x = i * (cellW + gap);
          return (
            <g
              key={`${i}-${c.label ?? c.value}`}
              onClick={() => onCellClick?.(i, c)}
              style={{ cursor: onCellClick ? "pointer" : "default" }}
              role={onCellClick ? "button" : "img"}
              aria-label={tooltip}
              tabIndex={onCellClick ? 0 : -1}
              onKeyDown={(ev) => ev.key === "Enter" && onCellClick?.(i, c)}
            >
              <rect
                x={x}
                y={0}
                width={cellW}
                height={height}
                rx={3}
                fill={fill}
                stroke={hasStatus ? fill : "transparent"}
                strokeWidth={hasStatus ? 1 : 0}
                opacity={hasStatus ? 0.85 : 1}
              >
                <title>{tooltip}</title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
