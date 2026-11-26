"use client";

/* ── StatCard (shared KPI card) ── */

import { memo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-text-primary",
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 text-text-muted">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
        </div>
        {href && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group surface-card bg-bg-surface p-4 sm:p-5 flex flex-col gap-2.5 hover:border-border-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="surface-card bg-bg-surface p-4 sm:p-5 flex flex-col gap-2.5">
      {inner}
    </div>
  );
});
