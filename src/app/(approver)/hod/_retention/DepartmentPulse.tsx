"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function DepartmentPulse({
  myRate,
  collegeAvg,
  myRank,
  totalDepts,
}: {
  myRate: number;
  collegeAvg: number;
  myRank: number;
  totalDepts: number;
}) {
  if (totalDepts === 0) return null;

  const delta = myRate - collegeAvg;
  const rankLabel =
    myRank === 1
      ? "Top department today"
      : myRank <= 3
      ? "Top 3 today"
      : `${ordinal(myRank)} of ${totalDepts}`;
  const TrendIcon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;
  const trendClass =
    delta > 1
      ? "text-[var(--action-primary)]"
      : delta < -1
      ? "text-[var(--action-warning)]"
      : "text-[var(--text-muted)]";

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Department pulse
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          today
        </span>
      </header>

      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
          {myRate}%
        </p>
        <span className="flex items-center gap-0.5 text-xs">
          <TrendIcon className={`size-3.5 ${trendClass}`} />
          <span className={trendClass}>
            {delta === 0
              ? "on par"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs college`}
          </span>
        </span>
      </div>

      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        {rankLabel} · college average {collegeAvg}%
      </p>

      {myRank <= 3 && (
        <p className="mt-3 rounded-lg bg-[var(--action-primary)]/10 px-2.5 py-1.5 text-[11px] text-[var(--action-primary)]">
          {myRank === 1
            ? "Your department has the best attendance in the college today. Keep it up."
            : `You're in the top ${myRank} departments. Students feel it.`}
        </p>
      )}
    </section>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
