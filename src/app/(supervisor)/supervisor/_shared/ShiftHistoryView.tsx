"use client";

import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";
import { CheckCircle2 } from "lucide-react";
import { WeekBar } from "./WeekBar";

export function ShiftHistoryView() {
  const cleanStreak = useSupervisorRetention((s) => s.cleanShiftStreak);
  const bests = useSupervisorRetention((s) => s.bests);

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Shift History</h1>
        <p className="text-xs text-[var(--text-muted)]">Historical record of completed shifts and handover logs</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-muted)]">Current Streak</p>
          <p className="text-2xl font-bold text-[var(--action-primary)] mt-1">{cleanStreak} shifts</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-muted)]">Best Shift Streak</p>
          <p className="text-2xl font-bold text-[var(--action-info)] mt-1">{bests.longestZeroIncidentShiftStreak} shifts</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <p className="text-[10px] uppercase text-[var(--text-muted)]">Most In A Shift</p>
          <p className="text-2xl font-bold text-[var(--action-warning)] mt-1">{bests.mostEscalationsInShift} cleared</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-[var(--action-primary)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Shift Audit Synchronized</p>
            <p className="text-xs text-[var(--text-muted)]">All handovers are committed to the central tamper-evident audit log.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
