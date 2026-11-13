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
        <h1 className="text-xl font-bold text-text-primary">Shift History</h1>
        <p className="text-xs text-text-muted">Historical record of completed shifts and handover logs</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-[10px] uppercase text-text-muted">Current Streak</p>
          <p className="text-2xl font-bold text-action-primary mt-1">{cleanStreak} shifts</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-[10px] uppercase text-text-muted">Best Shift Streak</p>
          <p className="text-2xl font-bold text-action-info mt-1">{bests.longestZeroIncidentShiftStreak} shifts</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <p className="text-[10px] uppercase text-text-muted">Most In A Shift</p>
          <p className="text-2xl font-bold text-action-warning mt-1">{bests.mostEscalationsInShift} cleared</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-action-primary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Shift Audit Synchronized</p>
            <p className="text-xs text-text-muted">All handovers are committed to the central tamper-evident audit log.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
