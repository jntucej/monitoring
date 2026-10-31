"use client";

import Link from "next/link";
import { Users, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export function FacultyCare({
  total,
  presentToday,
  lateToday,
  absentToday,
}: {
  total: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
}) {
  const needsAttention = lateToday + absentToday;
  const allPresent = needsAttention === 0 && total > 0;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-[var(--action-info)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Faculty care
          </h2>
        </div>
        <Link
          href="/hod/faculty/attendance"
          className="text-[11px] text-[var(--action-primary)] hover:underline"
        >
          Details
        </Link>
      </header>

      {allPresent ? (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--action-primary)]/10 px-3 py-2.5">
          <CheckCircle2 className="size-4 text-[var(--action-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--action-primary)]">
              All {total} faculty checked in today
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Nobody is left behind.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--action-warning)]/10 px-3 py-2">
            <AlertCircle className="size-4 text-[var(--action-warning)]" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {needsAttention} faculty need attention
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {presentToday}/{total} present ·{" "}
                {lateToday > 0 && `${lateToday} late · `}
                {absentToday > 0 && `${absentToday} absent`}
              </p>
            </div>
            <ArrowRight className="size-3.5 text-[var(--text-muted)]" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Present</p>
              <p className="text-lg font-semibold tabular-nums text-[var(--action-primary)]">
                {presentToday}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Late</p>
              <p className="text-lg font-semibold tabular-nums text-[var(--action-warning)]">
                {lateToday}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Absent</p>
              <p className="text-lg font-semibold tabular-nums text-[var(--action-danger)]">
                {absentToday}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
