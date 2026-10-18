"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { HeatMatrixProps } from "./types";
import { heatColor, clamp01, VIZ_THEME } from "./theme";

/** CSS-grid heat matrix: row headers on the left, column headers on top.
 *  Cell fill intensity = value / max (via heatColor). A negative data value
 *  renders as an empty (missing) cell. */
export function HeatMatrix({ rows, cols, data, label, onCellClick, cellSize = 20, className }: HeatMatrixProps) {
  const max = useMemo(() => {
    let m = 0;
    for (const row of data) for (const v of row) if (v > m) m = v;
    return m;
  }, [data]);

  const rowHeaderW = 90;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 text-[11px] font-medium" style={{ color: VIZ_THEME.muted }}>
        {label}
      </div>
      <div
        role="img"
        aria-label={label}
        className="grid gap-px"
        style={{
          gridTemplateColumns: `minmax(${rowHeaderW}px, auto) repeat(${cols.length}, minmax(0, ${cellSize}px))`,
        }}
      >
        {/* top-left corner spacer */}
        <div />
        {/* column headers */}
        {cols.map((c, i) => (
          <div
            key={`col-${i}`}
            className="truncate pb-1 text-[10px]"
            style={{ color: VIZ_THEME.muted }}
            title={c}
          >
            {c}
          </div>
        ))}

        {rows.map((r, ri) => {
          const row = data[ri] ?? [];
          return (
            <MatrixRow
              key={`row-${ri}`}
              r={r}
              row={row}
              cols={cols}
              max={max}
              cellSize={cellSize}
              onCellClick={onCellClick}
            />
          );
        })}
      </div>
    </div>
  );
}

function MatrixRow({
  r,
  row,
  cols,
  max,
  cellSize,
  onCellClick,
}: {
  r: string;
  row: number[];
  cols: string[];
  max: number;
  cellSize: number;
  onCellClick?: (row: string, col: string, value: number) => void;
}) {
  return (
    <>
      <div
        className="flex items-center truncate pr-2 text-[11px]"
        style={{ color: VIZ_THEME.text }}
        title={r}
      >
        {r}
      </div>
      {cols.map((c, ci) => {
        const value = row[ci];
        const missing = value == null || value < 0;
        const fill = missing ? "transparent" : heatColor(max > 0 ? clamp01(value / max) : 0);
        const interactive = !missing && !!onCellClick;
        return (
          <button
            key={`${r}-${c}`}
            type="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={missing ? `${r} × ${c}: missing` : `${r} × ${c}: ${value}`}
            onClick={() => !missing && onCellClick?.(r, c, value)}
            onKeyDown={(ev) => ev.key === "Enter" && !missing && onCellClick?.(r, c, value)}
            style={{
              width: cellSize,
              height: cellSize,
              background: missing ? "rgba(0,0,0,0)" : fill,
              border: "1px solid var(--border)",
              borderRadius: 3,
              cursor: interactive ? "pointer" : "default",
              padding: 0,
            }}
          >
            <span className="sr-only">{missing ? "no data" : String(value)}</span>
          </button>
        );
      })}
    </>
  );
}
