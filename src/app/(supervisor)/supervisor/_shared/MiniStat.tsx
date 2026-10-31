import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MiniStatProps {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "danger" | "info" | "neutral";
  className?: string;
}

export function MiniStat({ label, value, tone = "neutral", className }: MiniStatProps) {
  const toneClasses = {
    ok: "text-[var(--action-primary)]",
    warn: "text-[var(--action-warning)]",
    danger: "text-[var(--action-danger)]",
    info: "text-[var(--action-info,#3b82f6)]",
    neutral: "text-[var(--text-primary)]",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3",
        className
      )}
    >
      <p className="text-[11px] font-medium text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums",
          toneClasses[tone] ?? toneClasses.neutral
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
