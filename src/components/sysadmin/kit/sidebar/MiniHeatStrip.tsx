"use client";

import { cn } from "@/lib/utils";
import { heatColor } from "../viz/theme";
import type { MiniProps } from "./types";

export interface MiniHeatStripProps extends MiniProps {
  cells: number[];
}

export function MiniHeatStrip({ cells, label, onClick, className }: MiniHeatStripProps) {
  if (!Array.isArray(cells) || cells.length === 0) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={label}
        className={cn("flex items-center gap-[1px] h-4 min-w-0 opacity-30", className)}
      >
        <span aria-hidden className="block w-[5px] h-[3px] rounded-[1px]" />
      </button>
    );
  }
  const max = Math.max(...cells, 1);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center gap-[1px] h-4 min-w-0", className)}
    >
      {cells.map((v, i) => (
        <span
          key={i}
          className="w-[5px] h-[3px] rounded-[1px] shrink-0"
          style={{ backgroundColor: heatColor(v / max) }}
        />
      ))}
    </button>
  );
}
