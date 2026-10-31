"use client";

import { GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * The HOD-specific impact card — shows how many students this HOD's
 * decisions have impacted this week. Feeds the "advocacy" retention hook:
 * teachers care about their students, not their throughput.
 */
export function ImpactCard({
  studentsTotal,
  onCampus,
  decisionsToday,
}: {
  studentsTotal: number;
  onCampus: number;
  decisionsToday: number;
}) {
  if (studentsTotal === 0) return null;

  const pct = Math.round((onCampus / studentsTotal) * 100);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-[var(--action-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Your students
          </h2>
        </div>
        <Link
          href="/hod/students"
          className="text-[11px] text-[var(--action-primary)] hover:underline"
        >
          All {studentsTotal}
        </Link>
      </header>

      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
          {pct}%
        </p>
        <span className="text-xs text-[var(--text-muted)]">on campus right now</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            On campus
          </p>
          <p className="text-lg font-semibold tabular-nums text-[var(--action-primary)]">
            {onCampus}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Off campus
          </p>
          <p className="text-lg font-semibold tabular-nums text-[var(--text-muted)]">
            {studentsTotal - onCampus}
          </p>
        </div>
      </div>

      {decisionsToday > 0 && (
        <p className="mt-3 flex items-center gap-1 rounded-lg bg-[var(--action-primary)]/5 px-2.5 py-1.5 text-[11px] text-[var(--action-primary)]">
          You cleared {decisionsToday} approval{decisionsToday === 1 ? "" : "s"} for them today
          <ArrowRight className="size-3" />
        </p>
      )}
    </section>
  );
}
