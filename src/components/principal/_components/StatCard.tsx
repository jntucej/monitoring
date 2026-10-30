"use client";

/* ── StatCard (shared KPI card) ── */

import { memo } from "react";

export const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-[var(--text-primary)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
});
