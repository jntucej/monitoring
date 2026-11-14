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
    ok: "text-action-primary",
    warn: "text-action-warning",
    danger: "text-action-danger",
    info: "text-[var(--action-info,var(--action-primary))]",
    neutral: "text-text-primary",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-surface p-3",
        className
      )}
    >
      <p className="text-xs font-medium text-text-muted">{label}</p>
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
