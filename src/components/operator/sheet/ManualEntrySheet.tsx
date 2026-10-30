"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound } from "lucide-react";
import { normalizeScannedPayload } from "@/lib/barcode";

interface ManualEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (roll: string) => void;
  gateId?: string;
}

export function ManualEntrySheet({ isOpen, onClose, onScan, gateId }: ManualEntrySheetProps) {
  const [rollInput, setRollInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    const raw = rollInput.trim().toUpperCase();
    const roll = raw.startsWith(">") ? raw.slice(1).trim() : raw;
    
    if (!roll) {
      setError("Please enter a roll number.");
      return;
    }

    const normalized = normalizeScannedPayload(roll);
    if (!normalized) {
      setError("Could not parse the roll number. Please check and try again.");
      return;
    }

    setError(null);
    onScan(normalized);
    setRollInput("");
  }, [rollInput, onScan]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [handleSubmit, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Manual entry"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-1 pb-3">
              <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[var(--action-primary)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Manual Entry</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input */}
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="manual-roll-input"
                  className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5"
                >
                  Roll / Employee ID
                </label>
                <input
                  id="manual-roll-input"
                  type="text"
                  value={rollInput}
                  onChange={(e) => {
                    setRollInput(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. 24JJ1A0501 or >24JJ1A0501"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-base font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400/20 flex items-center justify-center text-[8px]">!</span>
                  {error}
                </p>
              )}

              <p className="text-xs text-[var(--text-muted)]">
                Type &gt; then roll number, or paste directly. Press Enter to submit.
              </p>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!rollInput.trim()}
                className="w-full py-3 rounded-xl bg-[var(--action-primary)] text-slate-950 font-bold text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
              >
                Verify Roll Number
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
