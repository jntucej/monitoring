"use client";

import { cn } from "@/lib/utils";
import { statusColor } from "../viz/theme";
import type { MiniProps } from "./types";

export interface MiniDotClusterProps extends MiniProps {
  statuses: ("ok" | "warn" | "error")[];
}

export function MiniDotCluster({ statuses, label, onClick, className }: MiniDotClusterProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center gap-[2px] h-4 min-w-0", className)}
    >
      {statuses.map((s, i) => (
        <span
          key={i}
          className="size-[5px] rounded-full shrink-0"
          style={{ backgroundColor: statusColor(s) }}
        />
      ))}
    </button>
  );
}
