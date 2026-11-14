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
    <section className="surface-card bg-bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-action-info" />
          <h2 className="text-sm font-semibold text-text-primary">
            Faculty care
          </h2>
        </div>
        <Link
          href="/hod/faculty/attendance"
          className="inline-flex min-h11 items-center text-xs text-action-primary hover:underline"
        >
          Details
        </Link>
      </header>

      {allPresent ? (
        <div className="surface-card flex items-center gap-2 bg-action-primary/10 px-3 py-2.5">
          <CheckCircle2 className="size-4 text-action-primary" />
          <div>
            <p className="text-sm font-medium text-action-primary">
              All {total} faculty checked in today
            </p>
            <p className="text-xs text-text-muted">
              Nobody is left behind.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="surface-card flex items-center gap-2 bg-action-warning/10 px-3 py-2">
            <AlertCircle className="size-4 text-action-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {needsAttention} faculty need attention
              </p>
              <p className="text-xs text-text-muted">
                {presentToday}/{total} present ·{" "}
                {lateToday > 0 && `${lateToday} late · `}
                {absentToday > 0 && `${absentToday} absent`}
              </p>
            </div>
            <ArrowRight className="size-3.5 text-text-muted" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">Present</p>
              <p className="text-lg font-semibold tabular-nums text-action-primary">
                {presentToday}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">Late</p>
              <p className="text-lg font-semibold tabular-nums text-action-warning">
                {lateToday}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">Absent</p>
              <p className="text-lg font-semibold tabular-nums text-action-danger">
                {absentToday}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
