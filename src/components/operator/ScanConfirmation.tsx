"use client";

import { motion } from "framer-motion";
import { User, CheckCircle2, LogIn, LogOut, X } from "lucide-react";

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
  suggestedDirection = "IN",
}: ScanConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md pb-safe"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative space-y-5">
        {/* Cancel Close Icon */}
        <button
          onClick={onCancel}
          aria-label="Cancel scan verification"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Verification Status Banner */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-full w-fit mx-auto">
          <CheckCircle2 className="w-4 h-4" />
          <span>Verified Student</span>
        </div>

        {/* Student Avatar & Basic Info */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-24 h-24 rounded-2xl overflow-hidden border-2 border-[var(--border-strong)] shadow-inner">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
                <User className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {student.name}
            </h2>
            <p className="text-sm font-mono font-semibold text-[var(--text-secondary)] mt-0.5">
              {student.roll}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {student.department}
            </p>
          </div>
        </div>

        {/* Operational Action CTA Buttons (64px Touch Targets) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onConfirm("IN")}
            className={`h-16 rounded-xl font-bold text-base flex flex-col items-center justify-center gap-1 shadow-md transition-all ${
              suggestedDirection === "IN"
                ? "bg-[var(--action-primary)] text-white ring-2 ring-emerald-400/40"
                : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--action-primary)]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <LogIn className="w-5 h-5" />
              <span>ENTER</span>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onConfirm("OUT")}
            className={`h-16 rounded-xl font-bold text-base flex flex-col items-center justify-center gap-1 shadow-md transition-all ${
              suggestedDirection === "OUT"
                ? "bg-[var(--action-danger)] text-white ring-2 ring-rose-400/40"
                : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--action-danger)]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <LogOut className="w-5 h-5" />
              <span>EXIT</span>
            </div>
          </motion.button>
        </div>

        <button
          onClick={onCancel}
          className="w-full text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1"
        >
          Dismiss & Resume Scanning
        </button>
      </div>
    </motion.div>
  );
}
