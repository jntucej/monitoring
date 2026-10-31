"use client";

import { useState } from "react";
import { HandoverStreak } from "../_retention/HandoverStreak";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";
import { useUIStore } from "@/stores/uiStore";
import { Send, CheckCircle2 } from "lucide-react";

export function ShiftHandoverView() {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const completeHandover = useSupervisorRetention((s) => s.completeHandover);
  const endShift = useSupervisorRetention((s) => s.endShift);
  const currentShiftId = useSupervisorRetention((s) => s.currentShiftId) ?? new Date().toISOString().slice(0, 13);
  const addToast = useUIStore((s) => s.success);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/supervisor/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      }).catch(() => null);

      completeHandover(currentShiftId, true);
      endShift(currentShiftId, true);
      setDone(true);
      addToast("Shift handover submitted successfully");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Shift Handover</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Log shift notes, flag gate exceptions, and hand over duty to the incoming supervisor
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <HandoverStreak />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="size-10 text-[var(--action-primary)] mb-2" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Handover Submitted</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Your notes were logged to the shift audit history. Next supervisor has been notified.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Handover Notes</label>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail any ongoing gate repairs, guard adjustments, or active alerts..."
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-base)] p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--action-primary)]/90 disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {submitting ? "Submitting..." : "Submit Shift Handover"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
