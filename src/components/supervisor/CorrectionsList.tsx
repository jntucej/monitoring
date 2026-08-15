"use client";
import { User, AlertTriangle } from "lucide-react";

const DUMMY_CORRECTIONS = [
  { id: 1, name: "Akarsh Jadi", roll: "2101CS02", issue: "Mismatched exit time", time: "10:32 AM", gate: "Gate 2" },
  { id: 2, name: "Bhavana", roll: "2101CS08", issue: "Manual entry required", time: "11:00 AM", gate: "Gate 1" },
  { id: 3, name: "Chandu", roll: "2101CS15", issue: "Late entry flag", time: "11:15 AM", gate: "Gate 1" },
];

export function CorrectionsList() {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Flagged Events for Correction</h3>
      </div>
      <div className="p-4 space-y-4">
        {DUMMY_CORRECTIONS.map((correction) => (
          <div key={correction.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{correction.name} <span className="text-sm text-[var(--text-muted)]">({correction.roll})</span></p>
                <p className="text-sm text-amber-400">{correction.issue}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">{correction.time} at {correction.gate}</p>
              <button className="text-sm font-medium text-sky-400 hover:underline">
                Review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
