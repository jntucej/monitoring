"use client";

import { ReactNode } from "react";

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
}

export function ChartCard({ title, description, legend, children, actions }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{description}</p>
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
          {actions && <div className="flex shrink-0">{actions}</div>}
        </div>
      </header>
      <div aria-hidden="false">{children}</div>
    </section>
  );
}