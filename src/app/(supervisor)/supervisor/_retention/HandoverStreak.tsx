"use client";

import { Repeat, CheckCircle2 } from "lucide-react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";

export function HandoverStreak() {
  const handoverStreak = useSupervisorRetention((s) => s.handoverStreak);
  const cleanStreak = useSupervisorRetention((s) => s.cleanShiftStreak);

  if (handoverStreak === 0 && cleanStreak === 0) {
    return (
      <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
        <header className="mb-2 flex items-center gap-2">
          <Repeat className="size-4 text-action-info" />
          <h2 className="text-sm font-semibold text-text-primary">
            Handover streak
          </h2>
        </header>
        <p className="text-xs text-text-muted">
          Submit a handover to start your streak. Every clean handover builds trust with the next shift.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Repeat className="size-4 text-action-info" />
        <h2 className="text-sm font-semibold text-text-primary">
          Shift record
        </h2>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Clean shifts
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-semibold tabular-nums text-action-primary">
              {cleanStreak}
            </p>
            <span className="text-xs text-text-muted">in a row</span>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-muted">
            Handovers
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-semibold tabular-nums text-action-info">
              {handoverStreak}
            </p>
            <span className="text-xs text-text-muted">on time</span>
          </div>
        </div>
      </div>

      {handoverStreak >= 3 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-action-primary/10 px-2.5 py-1.5 text-xs text-action-primary">
          <CheckCircle2 className="size-3" />
          {handoverStreak} clean handovers — the next shift trusts your notes.
        </p>
      )}
    </section>
  );
}
