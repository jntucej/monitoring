"use client";

import { motion } from "framer-motion";
import { User, CheckCircle2, LogIn, LogOut, Home, Sun, Clock, X } from "lucide-react";

interface ScanConfirmationProps {
  student: {
    name: string;
    roll: string;
    department: string;
    year?: number;
    photo?: string;
  };
  onConfirm: (direction: "IN" | "OUT", reason?: string) => void;
  onCancel: () => void;
  suggestedDirection?: "IN" | "OUT";
}

export function ScanConfirmation({
  student,
  onConfirm,
  onCancel,
}: ScanConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pb-safe select-none"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl relative space-y-5">
        {/* Cancel Close Icon */}
        <button
          onClick={onCancel}
          aria-label="Cancel scan verification"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors border border-[var(--border)]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Verification Status Banner */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-full w-fit mx-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Student Record Identified</span>
        </div>

        {/* Student Avatar & Basic Info */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--border-strong)] shadow-md">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
                <User className="w-9 h-9 text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              {student.name}
            </h2>
            <p className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
              {student.roll}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {student.department}
            </p>
          </div>
        </div>

        {/* Action Movement Category Selection */}
        <div className="space-y-3 pt-1">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] block text-center">
            Select Movement Action & Pass Type
          </label>

          {/* Quick Direct In / Out Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onConfirm("IN", "Day Scholar Entry")}
              className="py-3 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Day Scholar In</span>
            </button>

            <button
              type="button"
              onClick={() => onConfirm("OUT", "Day Scholar Exit")}
              className="py-3 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Day Scholar Out</span>
            </button>
          </div>

          {/* Hostel Pass Actions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onConfirm("OUT", "Hostel Home Out")}
              className="py-2.5 px-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:border-amber-500/50 text-[var(--text-primary)] font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>Home Out</span>
            </button>

            <button
              type="button"
              onClick={() => onConfirm("IN", "Hostel Home In")}
              className="py-2.5 px-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:border-sky-500/50 text-[var(--text-primary)] font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
            >
              <Home className="w-4 h-4 text-sky-400" />
              <span>Home In</span>
            </button>

            <button
              type="button"
              onClick={() => onConfirm("OUT", "Hostel Day Out")}
              className="py-2.5 px-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] hover:border-purple-500/50 text-[var(--text-primary)] font-bold text-[11px] flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
            >
              <Sun className="w-4 h-4 text-purple-400" />
              <span>Day Out</span>
            </button>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="w-full text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1 text-center"
        >
          Cancel & Resume Scanning
        </button>
      </div>
    </motion.div>
  );
}
