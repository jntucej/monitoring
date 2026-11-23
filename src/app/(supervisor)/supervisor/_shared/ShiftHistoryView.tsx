"use client";

import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";
import { CheckCircle2 } from "lucide-react";
import { EntityInspector } from "@/components/shared/EntityInspector";
import { shiftInspection, useRoleInspectorHost } from "@/components/shared/roleInspectors";
import { WeekBar } from "./WeekBar";

/**
 * Shift history view. The streak cards describe the current shift record,
 * not a per-shift list; the inspector exposes that record with the
 * real backend surface (GET /api/supervisor/shift), read-only for the
 * worker role and handover-linked for the supervisor.
 */
export function ShiftHistoryView() {
  const cleanStreak = useSupervisorRetention((s) => s.cleanShiftStreak);
  const bests = useSupervisorRetention((s) => s.bests);
  const { inspection, inspect, closeInspection, role } = useRoleInspectorHost();

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-xl font-bold text-text-primary">Shift History</h1>
        <p className="text-xs text-text-muted">Historical record of completed shifts and handover logs</p>
      </header>

      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        onClick={() =>
          inspect(
            shiftInspection(
              {
                isClean: cleanStreak > 0,
                notes: "Clean-shift streak and best records are tracked by the retention engine; per-shift handover entries are committed to the tamper-evident audit log.",
              },
              role,
            ),
          )
        }
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.click();
        }}
      >
        <div className="surface-card bg-bg-surface p-4">
          <p className="text-xs uppercase text-text-muted">Current Streak</p>
          <p className="text-2xl font-bold text-action-primary mt-1">{cleanStreak} shifts</p>
        </div>
        <div className="surface-card bg-bg-surface p-4">
          <p className="text-xs uppercase text-text-muted">Best Shift Streak</p>
          <p className="text-2xl font-bold text-action-info mt-1">{bests.longestZeroIncidentShiftStreak} shifts</p>
        </div>
        <div className="surface-card bg-bg-surface p-4">
          <p className="text-xs uppercase text-text-muted">Most In A Shift</p>
          <p className="text-2xl font-bold text-action-warning mt-1">{bests.mostEscalationsInShift} cleared</p>
        </div>
      </div>

      <div className="surface-card bg-bg-surface p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-action-primary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Shift Audit Synchronized</p>
            <p className="text-xs text-text-muted">All handovers are committed to the central tamper-evident audit log.</p>
          </div>
        </div>
      </div>

      <EntityInspector inspection={inspection} onClose={closeInspection} />
    </div>
  );
}
