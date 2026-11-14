"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types";
import type { ExitReason } from "@/lib/types";
import type { EntryButtonId, Recommendation } from "@/lib/operator-recommend";

interface ConfirmSheetProps {
  student: Student | null;
  recommendation: Recommendation | null;
  onConfirm: (direction: "IN" | "OUT", reason?: ExitReason, entryType?: "hosteller" | "day_scholar", buttonId?: EntryButtonId) => void;
  onCancel: () => void;
  /** ms before auto-confirm (null = manual only). */
  autoConfirmMs?: number | null;
  /** Current entry type from the operator store. */
  currentEntryType?: "hosteller" | "day_scholar" | null;
  /** Last out reason for context. */
  lastOutReason?: ExitReason | null;
  isOpen?: boolean;
}

export function ConfirmSheet({
  student,
  recommendation,
  onConfirm,
  onCancel,
  autoConfirmMs = null,
  currentEntryType: _currentEntryType,
  lastOutReason: _lastOutReason,
  isOpen = true,
}: ConfirmSheetProps) {
  const [selectedDirection, setSelectedDirection] = useState<"IN" | "OUT">(
    recommendation?.direction || "IN"
  );
  const [selectedReason, setSelectedReason] = useState<ExitReason | undefined>(
    () => recommendation?.reason as ExitReason | undefined
  );
  const [selectedEntryType, setSelectedEntryType] = useState<"hosteller" | "day_scholar" | undefined>(
    () => recommendation?.entryType as "hosteller" | "day_scholar" | undefined
  );
  const [selectedButtonId] = useState<EntryButtonId | undefined>(
    () => recommendation?.entryButton as EntryButtonId | undefined
  );
  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown timer for auto-confirm.
  useState(() => {
    if (!autoConfirmMs || autoConfirmMs <= 0 || !student) return;
    // Skip auto-confirm for flagged students.
    if (student.flagStatus) return;
    const t = setTimeout(() => {
      setCountdown(null);
      onConfirm(selectedDirection, selectedReason, selectedEntryType, selectedButtonId);
    }, autoConfirmMs);
    return () => clearTimeout(t);
  });

  const handleConfirm = useCallback(() => {
    onConfirm(selectedDirection, selectedReason, selectedEntryType, selectedButtonId);
  }, [onConfirm, selectedDirection, selectedReason, selectedEntryType, selectedButtonId]);

  if (!student || !isOpen) return null;

  // Flag banner.
  const flagBanner = student.flagStatus ? (
    <div className="surface-card flex items-start gap-3 px-4 py-3 bg-rose-500/10 text-action-danger">
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-action-danger" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-xs uppercase tracking-wider">{student.flagStatus}</span>
        </div>
        <p className="text-xs opacity-90 mt-0.5">
          {student.flagStatus === "UNAUTHORIZED_EXIT" && "Exit attempt without valid pass."}
          {student.flagStatus === "NO_GATE_PASS" && "No approved gate pass on file."}
          {student.flagStatus === "SUSPENDED" && "Account is suspended."}
          {student.flagStatus === "MANUAL_LOCKDOWN" && "Account manually locked."}
          {student.flagStatus === "OVERDUE" && "Approved pass window has lapsed."}
          {student.flagStatus === "CURFEW_VIOLATION" && "Movement attempted outside curfew."}
          {!["UNAUTHORIZED_EXIT", "NO_GATE_PASS", "SUSPENDED", "MANUAL_LOCKDOWN", "OVERDUE", "CURFEW_VIOLATION"].includes(student.flagStatus || "") &&
            "Flagged student — verify before proceeding."}
        </p>
      </div>
    </div>
  ) : null;

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
            onClick={onCancel}
            aria-hidden="true"
          />
          
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-bg-surface border-t border-border rounded-t-2xl shadow-2xl max-h-[85dvh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Scan confirmation"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bgborder" />
            </div>

            {/* Header */}
            <div className="surface-card flex items-center justify-between px-4 py-3">
              <h2 className="text-sm font-bold text-text-primary">Confirm Scan</h2>
              <button
                type="button"
                onClick={onCancel}
                className="size-6 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                aria-label="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Flag banner */}
              {flagBanner}

              {/* Student info */}
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-action-primary/20 text-action-primary flex items-center justify-center text-lg font-bold">
                  {student.name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-text-primary truncate">
                    {student.name || student.roll || "Unknown"}
                  </p>
                  {student.roll && (
                    <p className="text-xs text-text-muted font-mono">{student.roll}</p>
                  )}
                  {student.department && (
                    <p className="text-xs text-text-muted">{student.department}</p>
                  )}
                </div>
              </div>

              {/* Direction + Reason */}
              {recommendation && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      Direction
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {(["IN", "OUT"] as const).map((dir) => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => setSelectedDirection(dir)}
                          className={cn(
                            "py-2.5 rounded-xl border text-sm font-bold transition-all",
                            selectedDirection === dir
                              ? "bg-action-primary border-action-primary text-black"
                              : "border-border bg-bg-base text-text-primary hover:border-border"
                          )}
                        >
                          {dir === "IN" ? "Entry (IN)" : "Exit (OUT)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entry type for students */}
                  {student.personType === "student" && selectedDirection === "IN" && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        Entry Type
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {(["hosteller", "day_scholar"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedEntryType(type)}
                            className={cn(
                              "py-2 px-3 rounded-lg border text-xs font-medium transition-colors",
                              selectedEntryType === type
                                ? "border-action-primary bg-action-primary/10 text-action-primary"
                                : "border-border bg-bg-base text-text-primary hover:border-border"
                            )}
                          >
                            {type === "hosteller" ? "Hosteller" : "Day Scholar"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason for exit */}
                  {selectedDirection === "OUT" && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                        Reason
                      </span>
                      <select
                        value={selectedReason || ""}
                        onChange={(e) => setSelectedReason(e.target.value as ExitReason)}
                        className="surface-card w-full px-3 py-2.5 bg-bg-base text-sm text-text-primary focus:ring-2 focus:ringfocus-ring outline-none"
                      >
                        <option value="">Select reason...</option>
                        <option value="daily_outing">Daily Outing</option>
                        <option value="home_out">Home Out</option>
                        <option value="day_pass">Day Pass</option>
                        <option value="emergency">Emergency</option>
                        <option value="special_leave">Special Leave</option>
                        <option value="day_scholar_out">Day Scholar Out</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="surface-card p-4 space-y-2">
              {autoConfirmMs && autoConfirmMs > 0 && countdown !== null && (
                <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  Auto-confirming in {countdown}ms...
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="surface-card py-3 text-sm font-semibold text-text-secondary hover:bg-bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="surface-card py-3 bg-action-primary text-black font-bold text-sm hover:brightness-110 transition-all active:scale-[0.99]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
