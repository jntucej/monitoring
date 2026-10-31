"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Flag, ShieldAlert, X, KeyRound } from "lucide-react";
import { ExitReason, ScanDirection, Student } from "@/lib/types";
import { getAvatarPlaceholder } from "@/lib/utils";

interface GateConfirmCardProps {
  student: Student;
  campusStatus: "IN" | "OUT" | null;
  lastOutReason?: string | null;
  onConfirm: (dir: ScanDirection, reason?: ExitReason | string, entryType?: "hosteller" | "day_scholar") => void | Promise<void>;
  onCancel: () => void;
  onManualEntry: () => void;
}

/**
 * Option A gate-desk confirmation card.
 *
 * Deliberately the opposite of the old ScanConfirmation: no recommendation
 * engine, no "1 recommended + 2 alternatives", no entry-type picker, no
 * auto-confirm. The operator's whole decision at the door is one of two:
 *   IN  — they are entering
 *   OUT — they are leaving
 * Entry type (hosteller vs day-scholar) is institutional data, pre-set by
 * startScan from student_details.current_entry_type; the store's confirmScan
 * resolves it without asking the operator. Two big buttons, always in the
 * same place, so muscle memory does the work.
 *
 * Renders as a small card at the TOP of the camera so the student's face
 * stays visible for badge/identity comparison.
 */
export function GateConfirmCard({
  student,
  campusStatus,
  lastOutReason,
  onConfirm,
  onCancel,
  onManualEntry,
}: GateConfirmCardProps) {
  // Flagged students: the card surfaces the flag banner; the two buttons are
  // still the only actions (no auto-fire was ever wired here), so a flagged
  // scan is always a deliberate tap.
  const flagged = Boolean(student.flagStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.16 }}
      className="pointer-events-auto w-full max-w-md mx-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xl space-y-3"
    >
      <div className="flex items-center gap-3">
        <img
          src={student.photo || getAvatarPlaceholder(student.name || "??")}
          alt={student.name || "Student"}
          width={56}
          height={56}
          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[var(--border)]"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[var(--text-primary)] truncate">{student.name || student.roll}</p>
          <p className="text-xs font-mono text-[var(--text-muted)] truncate">{student.roll}</p>
        </div>
        {campusStatus && (
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              campusStatus === "IN"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
            }`}
          >
            {campusStatus === "IN" ? "On campus" : "Out"}
          </span>
        )}
      </div>

      {flagged && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug">
            <span className="font-extrabold uppercase tracking-wide">{student.flagStatus}</span>
            <span className="opacity-80"> — verify before releasing.</span>
          </p>
        </div>
      )}

      {!flagged && lastOutReason && campusStatus === "OUT" && (
        <p className="text-[11px] text-[var(--text-muted)]">Last out · {lastOutReason}</p>
      )}

      {/* The two decisions — always the same two, always the same place. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onConfirm("IN")}
          className="min-h-[56px] rounded-xl bg-[var(--action-primary)] text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          <LogIn className="w-5 h-5" /> IN
        </button>
        <button
          type="button"
          onClick={() => onConfirm("OUT")}
          className="min-h-[56px] rounded-xl bg-[var(--action-danger)] text-white font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          <LogOut className="w-5 h-5" /> OUT
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <button
          type="button"
          onClick={onManualEntry}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:text-[var(--text-primary)] transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" /> Manual entry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </motion.div>
  );
}
