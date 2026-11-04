import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "danger" | "info" | "neutral";
  className?: string;
}

export function KpiCard({ label, value, tone = "neutral", className }: KpiCardProps) {
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
        "rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4",
        className
      )}
    >
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          toneClasses[tone] ?? toneClasses.neutral
        )}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
