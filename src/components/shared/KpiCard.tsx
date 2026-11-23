import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DataFreshness, type FreshnessStatus } from "./DataFreshness";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "danger" | "info" | "neutral";
  className?: string;
  /**
   * Drilldown behavior: when provided, the whole card (and its number)
   * becomes a control. `onClick` opens an in-page inspector (preferred —
   * the register state stays intact); `drilldownHref` navigates to the
   * register WITH the pre-filter applied (e.g. ?overdue=true).
   */
  onClick?: () => void;
  drilldownHref?: string;
  /** Hover hint shown as a small subtitle under the value. */
  hint?: string;
  /**
   * Show a data-freshness indicator in the card footer.
   * Requires `lastFetched` to be set; when both are provided the footer
   * renders a <DataFreshness/> dot + "Updated Xs ago" text.
   */
  freshness?: boolean;
  /** Epoch-ms (or Date) timestamp of when this KPI's data was last fetched. */
  lastFetched?: Date | number;
  /** Override the derived freshness status (e.g. when the panel is offline). */
  freshnessStatus?: FreshnessStatus;
}

export function KpiCard({
  label,
  value,
  tone = "neutral",
  className,
  onClick,
  drilldownHref,
  hint,
  freshness,
  lastFetched,
  freshnessStatus,
}: KpiCardProps) {
  const toneClasses = {
    ok: "text-action-primary",
    warn: "text-action-warning",
    danger: "text-action-danger",
    info: "text-[var(--action-info,var(--action-primary))]",
    neutral: "text-text-primary",
  };

  const body = (
    <div
      className={cn(
        "rounded-2xl border border-border bg-bg-surface p-4 h-full",
        onClick && "cursor-pointer transition-colors hover:border-action-primary/40",
        className
      )}
    >
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          toneClasses[tone] ?? toneClasses.neutral
        )}
      >
        {value ?? "—"}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-text-muted">{hint}</p>
      ) : null}
      {freshness && lastFetched !== undefined ? (
        <div className="mt-3 pt-2 border-t border-border">
          <DataFreshness
            timestamp={lastFetched}
            status={freshnessStatus}
            autoRefresh
          />
        </div>
      ) : null}
    </div>
  );

  if (drilldownHref) {
    return (
      <a href={drilldownHref} onClick={onClick} aria-label={`${label}: ${String(value ?? "")} — open filtered register`}>
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left" aria-label={`${label}: ${String(value ?? "")}`}>
        {body}
      </button>
    );
  }
  return body;
}
