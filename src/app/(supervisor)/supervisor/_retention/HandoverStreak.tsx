"use client";

import { Repeat, CheckCircle2 } from "lucide-react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";

export function HandoverStreak() {
  const handoverStreak = useSupervisorRetention((s) => s.handoverStreak);
  const cleanStreak = useSupervisorRetention((s) => s.cleanShiftStreak);

  if (handoverStreak === 0 && cleanStreak === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <header className="mb-2 flex items-center gap-2">
          <Repeat className="size-4 text-[var(--action-info)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Handover streak
          </h2>
        </header>
        <p className="text-xs text-[var(--text-muted)]">
          Submit a handover to start your streak. Every clean handover builds trust with the next shift.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Repeat className="size-4 text-[var(--action-info)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Shift record
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Clean shifts
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-semibold tabular-nums text-[var(--action-primary)]">
              {cleanStreak}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">in a row</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Handovers
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-semibold tabular-nums text-[var(--action-info)]">
              {handoverStreak}
            </p>
            <span className="text-[10px] text-[var(--text-muted)]">on time</span>
          </div>
        </div>
      </div>

      {handoverStreak >= 3 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--action-primary)]/10 px-2.5 py-1.5 text-[11px] text-[var(--action-primary)]">
          <CheckCircle2 className="size-3" />
          {handoverStreak} clean handovers — the next shift trusts your notes.
        </p>
      )}
    </section>
  );
}
