"use client";

import { cn } from "@/lib/utils";
import type { MiniProps } from "./types";

export interface MiniStackedBarProps extends MiniProps {
  segments: { value: number; color: string }[];
}

export function MiniStackedBar({ segments, label, onClick, className }: MiniStackedBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center h-4 min-w-0", className)}
    >
      <div className="w-11 h-[6px] rounded-full overflow-hidden flex bg-[var(--border)]">
        {total > 0 &&
          segments.map((seg, i) => (
            <span
              key={i}
              className="h-full"
              style={{
                width: `${(seg.value / total) * 100}%`,
                backgroundColor: seg.color,
              }}
            />
          ))}
      </div>
    </button>
  );
}
