import React, { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataFreshness, type FreshnessStatus } from "./DataFreshness";

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
   * (PR-05A) Drill-down target. When provided the card becomes interactive
   * (a11y: keyboard-focusable, aria-label includes the label + value).
   * Omit for purely informational cards.
   */
  drilldown?: KpiDrilldown;
  /** (PR-05A) Optional secondary line under the value (e.g. "5 overdue"). */
  sub?: ReactNode;
  /**
   * (main) Drilldown behavior: when provided, the whole card (and its number)
   * becomes a control. `onClick` opens an in-page inspector (preferred —
   * the register state stays intact); `drilldownHref` navigates to the
   * register WITH the pre-filter applied (e.g. ?overdue=true).
   */
  onClick?: () => void;
  drilldownHref?: string;
  /** (main) Hover hint shown as a small subtitle under the value. */
  hint?: string;
  /**
   * (main) Show a data-freshness indicator in the card footer.
   * Requires `lastFetched` to be set; when both are provided the footer
   * renders a <DataFreshness/> dot + "Updated Xs ago" text.
   */
  freshness?: boolean;
  /** (main) Epoch-ms (or Date) timestamp of when this KPI's data was last fetched. */
  lastFetched?: Date | number;
  /** (main) Override the derived freshness status (e.g. when the panel is offline). */
  freshnessStatus?: FreshnessStatus;
}

export function KpiCard({
  label,
  value,
  tone = "neutral",
  className,
  drilldown,
  sub,
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

  // Interactive when EITHER API is used: the PR-05A `drilldown` control or
  // the main `onClick`/`drilldownHref` inspector control.
  const interactive = Boolean(drilldown) || Boolean(onClick) || Boolean(drilldownHref);
  const ariaLabel = interactive
    ? `${label}: ${String(value ?? "")}${drilldown?.label ? ` — ${drilldown.label}` : ""}`
    : undefined;

  // Card body: value + optional secondary lines from both sides.
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
      {sub != null && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
      {hint ? <p className="mt-1 text-[11px] text-text-muted">{hint}</p> : null}
      {drilldown && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-action-primary">
          {drilldown.label} <ChevronRight className="h-3 w-3" />
        </p>
      )}
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

  // PR-05A `drilldown` API: route gateway (real <a>, SPA-compatible) or an
  // in-page control (<button> running a state change, e.g. filtering the register).
  if (drilldown?.href && !drilldown?.onClick) {
    return (
      <a
        href={drilldown.href}
        aria-label={ariaLabel}
        className="block transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        {body}
      </a>
    );
  }
  if (drilldown?.onClick) {
    return (
      <button
        type="button"
        onClick={drilldown.onClick}
        aria-label={ariaLabel}
        className="block w-full text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        {body}
      </button>
    );
  }

  // main `onClick`/`drilldownHref` API.
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
