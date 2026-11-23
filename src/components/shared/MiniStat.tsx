import React, { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MiniStatDrilldown {
  label: string;
  href: string;
}

export interface MiniStatProps {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "danger" | "info" | "neutral";
  className?: string;
  /** When set, the stat becomes a drilldown control into the underlying records. */
  drilldown?: MiniStatDrilldown;
  /** Optional secondary line (e.g. "3 overdue"). */
  sub?: ReactNode;
}

export function MiniStat({ label, value, tone = "neutral", className, drilldown, sub }: MiniStatProps) {
  const toneClasses = {
    ok: "text-action-primary",
    warn: "text-action-warning",
    danger: "text-action-danger",
    info: "text-[var(--action-info,var(--action-primary))]",
    neutral: "text-text-primary",
  };

  const body = (
    <div className={cn("rounded-xl border border-border bg-bg-surface p-3", className)}>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", toneClasses[tone] ?? toneClasses.neutral)}>
        {value ?? "—"}
      </p>
      {sub != null && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
      {drilldown && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-action-primary">
          {drilldown.label} <ChevronRight className="h-3 w-3" />
        </p>
      )}
    </div>
  );

  if (!drilldown) return body;

  return (
    <a
      href={drilldown.href}
      aria-label={`${label}: ${String(value ?? "")} — ${drilldown.label}`}
      className="block rounded-xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
    >
      {body}
    </a>
  );
}
