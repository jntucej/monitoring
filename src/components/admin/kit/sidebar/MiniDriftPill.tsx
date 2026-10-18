"use client";

import { cn } from "@/lib/utils";
import type { MiniProps } from "./types";

export interface MiniDriftPillProps extends MiniProps {
  driftCount: number;
}

export function MiniDriftPill({ driftCount, label, onClick, className }: MiniDriftPillProps) {
  const isDrift = driftCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center h-4 min-w-0", className)}
    >
      <span
        className="px-1.5 h-[16px] rounded-full text-[9px] font-medium leading-[16px] flex items-center shrink-0"
        style={
          isDrift
            ? {
                backgroundColor: "color-mix(in srgb, var(--action-danger) 18%, transparent)",
                color: "var(--action-danger)",
                border: "1px solid color-mix(in srgb, var(--action-danger) 40%, transparent)",
              }
            : {
                backgroundColor: "color-mix(in srgb, var(--action-primary) 18%, transparent)",
                color: "var(--action-primary)",
                border: "1px solid color-mix(in srgb, var(--action-primary) 40%, transparent)",
              }
        }
      >
        {isDrift ? `${driftCount} drift` : "✓"}
      </span>
    </button>
  );
}
