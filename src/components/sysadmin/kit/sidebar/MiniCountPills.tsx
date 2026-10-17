"use client";

import { cn } from "@/lib/utils";
import type { MiniProps } from "./types";

export interface MiniCountPillsProps extends MiniProps {
  counts: number[];
}

export function MiniCountPills({ counts, label, onClick, className }: MiniCountPillsProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center h-4 min-w-0", className)}
    >
      <span className="text-[9px] font-medium text-[var(--text-muted)] tracking-tight">
        {counts.join(" · ")}
      </span>
    </button>
  );
}
