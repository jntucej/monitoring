"use client";

import { cn } from "@/lib/utils";
import type { MiniProps } from "./types";

export interface MiniSeverityChipsProps extends MiniProps {
  counts: { critical: number; high: number; medium: number; low: number };
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "var(--action-danger)", text: "#fff", label: "crit" },
  high: { bg: "var(--action-warning)", text: "#000", label: "high" },
  medium: { bg: "var(--action-info)", text: "#fff", label: "med" },
  low: { bg: "var(--text-muted)", text: "var(--bg-surface)", label: "low" },
};

export function MiniSeverityChips({ counts, label, onClick, className }: MiniSeverityChipsProps) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn("flex items-center gap-[2px] h-4 min-w-0", className)}
    >
      {entries.map(([key, n]) => {
        const s = SEVERITY_STYLES[key];
        return (
          <span
            key={key}
            className="px-1 h-[14px] rounded-[3px] text-[8px] font-medium leading-[14px] flex items-center shrink-0"
            style={{ backgroundColor: s.bg, color: s.text }}
          >
            {n}
          </span>
        );
      })}
      {entries.length === 0 && <span className="text-[8px] text-[var(--text-muted)]">0</span>}
    </button>
  );
}
