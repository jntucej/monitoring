"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, ListChecks } from "lucide-react";
import { normalizeScannedPayload } from "@/lib/barcode";
import { ReasonSelect } from "@/components/shared/ReasonSelect";
import type { WorkflowType } from "@/lib/types";

interface ManualEntrySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (roll: string, reason?: string) => void;
  gateId?: string;
  /** Workflow type that scopes the reason list — "hostel" for student manual entries. */
  workflowType?: WorkflowType;
}

export function ManualEntrySheet({ isOpen, onClose, onScan, gateId: _gateId, workflowType = "hostel" }: ManualEntrySheetProps) {
  const [rollInput, setRollInput] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [_reasonLabel, setReasonLabel] = useState("");
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
    // O15: pass the structured reason code when one is selected.
    onScan(normalized, reasonCode || undefined);
    setRollInput("");
    setReasonCode("");
    setReasonLabel("");
  }, [rollInput, reasonCode, onScan]);

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
            className="fixed inset-x-0 bottom-0 z-50 bg-bg-surface border-t border-border rounded-t-2xl shadow-2xl p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Manual entry"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-1 pb-3">
              <div className="w-12 h-1.5 rounded-full bgborder" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-action-primary" />
                <h2 className="text-sm font-bold text-text-primary">Manual Entry</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated"
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
                  className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5"
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
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border text-base font-mono font-bold tracking-wider text-text-primary uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ringfocus-ring outline-none"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-action-danger flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400/20 flex items-center justify-center text-xs">!</span>
                  {error}
                </p>
              )}

              {/* O15: structured reason — replaces the free-text input */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Entry reason <span className="normal-case text-text-muted/60">(optional)</span>
                  </label>
                </div>
                <ReasonSelect
                  workflowType={workflowType}
                  value={reasonCode}
                  onChange={(code, label) => { setReasonCode(code); setReasonLabel(label); }}
                />
              </div>

              <p className="text-xs text-text-muted">
                Type &gt; then roll number, or paste directly. Press Enter to submit.
              </p>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!rollInput.trim()}
                className="w-full py-3 rounded-xl bg-action-primary text-black font-bold text-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
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
