import React, { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiDrilldown {
  /** Label of the drill affordance, e.g. "View decisions", "Inspect stage". */
  label: string;
  /**
   * Where the metric leads — a principal register/route. The KPI card is a
   * DRILLDOWN CONTROL, not a dead number: clicking it must take the user to
   * the underlying records. Ignored when `onClick` is set (in-page filter).
   */
  href?: string;
  /** In-page action (e.g. filter the register). Takes precedence over href. */
  onClick?: () => void;
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "danger" | "info" | "neutral";
  className?: string;
  /**
   * Drill-down target. When provided the card becomes interactive
   * (a11y: keyboard-focusable, aria-label includes the label + value).
   * Omit for purely informational cards.
   */
  drilldown?: KpiDrilldown;
  /** Optional secondary line under the value (e.g. "5 overdue"). */
  sub?: ReactNode;
}

export function KpiCard({
  label,
  value,
  tone = "neutral",
  className,
  drilldown,
  sub,
}: KpiCardProps) {
  const toneClasses = {
    ok: "text-action-primary",
    warn: "text-action-warning",
    danger: "text-action-danger",
    info: "text-[var(--action-info,var(--action-primary))]",
    neutral: "text-text-primary",
  };

  const interactive = Boolean(drilldown);
  const ariaLabel = interactive
    ? `${label}: ${String(value ?? "")}${drilldown?.label ? ` — ${drilldown.label}` : ""}`
    : undefined;

  const inner = (
    <>
      <div className={cn("rounded-2xl border border-border bg-bg-surface p-4", className)}>
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClasses[tone] ?? toneClasses.neutral)}>
          {value ?? "—"}
        </p>
        {sub != null && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
        {drilldown && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-action-primary">
            {drilldown.label} <ChevronRight className="h-3 w-3" />
          </p>
        )}
      </div>
    </>
  );

  if (!interactive) return <>{inner}</>;

  // Two shapes: a route gateway (real <a>, SPA-compatible) or an in-page
  // control (<button> running a state change, e.g. filtering the register).
  if (drilldown!.href && !drilldown!.onClick) {
    return (
      <a
        href={drilldown!.href}
        aria-label={ariaLabel}
        className="block transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={drilldown!.onClick ?? undefined}
      aria-label={ariaLabel}
      className="block w-full text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
    >
      {inner}
    </button>
  );
}
