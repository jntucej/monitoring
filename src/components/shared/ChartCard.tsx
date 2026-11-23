"use client";

import { ReactNode } from "react";
import Link from "next/link";

export interface ChartLegendItem {
  label: string;
  color: string;
}

export interface ChartCardProps {
  title: string;
  description?: string;
  legend?: ChartLegendItem[];
  children: ReactNode;
  /** Optional footer actions (e.g., download, expand) */
  actions?: ReactNode;
  /** 1-line anomaly or "so what?" insight callout rendered above the chart */
  insight?: string;
  /** Baseline comparison delta badge (e.g. "+12% vs 7d avg") */
  delta?: { label: string; tone?: "ok" | "warn" | "danger" | "neutral" };
  /** Optional drill-down route */
  drillHref?: string;
  drillLabel?: string;
}

export function ChartCard({
  title,
  description,
  legend,
  children,
  actions,
  insight,
  delta,
  drillHref,
  drillLabel = "Drill down →",
}: ChartCardProps) {
  const deltaTone =
    delta?.tone === "ok"
      ? "bg-emerald-500/10 text-action-success"
      : delta?.tone === "warn"
      ? "bg-amber-500/10 text-action-warning"
      : delta?.tone === "danger"
      ? "bg-rose-500/10 text-action-danger"
      : "bg-bg-elevated text-text-secondary";

  return (
    <section className="surface-card bg-bg-surface p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{title}</h3>
            {delta && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${deltaTone}`}>
                {delta.label}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-text-muted truncate">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {legend && (
            <ul className="flex items-center gap-3 text-xs" role="list" aria-label="Chart legend">
              {legend.map((l) => (
                <li key={l.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </li>
              ))}
            </ul>
          )}
          {drillHref && (
            <Link href={drillHref} className="text-xs font-semibold text-action-primary hover:underline">
              {drillLabel}
            </Link>
          )}
          {actions && <div className="flex shrink-0">{actions}</div>}
        </div>
      </header>
      {insight && (
        <p className="mb-3 rounded-lg border border-border bg-bg-elevated/60 px-3 py-1.5 text-xs text-text-secondary">
          {insight}
        </p>
      )}
      <div aria-hidden="false">{children}</div>
    </section>
  );
}