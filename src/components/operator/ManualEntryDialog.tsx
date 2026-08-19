"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Info, User, ArrowRight, Lock } from "lucide-react";
import { findStudentByRoll } from "@/lib/db";
import { parseRollNumber, validateRollNumber } from "@/lib/rollNumber";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import type { ScanDirection, ExitReason } from "@/lib/types";

interface ManualEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gateId: string;
}

export function ManualEntryDialog({ isOpen, onClose, gateId }: ManualEntryDialogProps) {
  const [rollInput, setRollInput] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [student, setStudent] = useState<any>(null);
  const [direction, setDirection] = useState<ScanDirection>("IN");
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [searching, setSearching] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useUIStore();

  // Real-time roll-number validation & decoding
  const rollValid = useMemo(() => (rollInput ? validateRollNumber(rollInput) : false), [rollInput]);
  const rollDecoded = useMemo(() => (rollInput ? parseRollNumber(rollInput) : null), [rollInput]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rollInput.trim() || !rollValid) return;
    setSearching(true);
    const found = await findStudentByRoll(rollInput.trim().toUpperCase());
    setSearching(false);
    if (found) {
      setStudent(found);
      setStep("confirm");
    }
  };

  const handlePinConfirm = async () => {
    if (pin.length !== 4) {
      addToast({
        title: "Invalid PIN",
        message: "Please enter a valid 4-digit supervisor PIN.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      // First verify the supervisor PIN via API
      const verifyRes = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: "SV001", pin }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        addToast({
          title: "PIN Verification Failed",
          message: "Invalid supervisor PIN. Please try again.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }

      // Get the authenticated supervisor ID from the token
      const token = verifyData.data.token;

      // Now submit the manual scan
      const scanRes = await fetch("/api/gate/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roll: student.roll,
          direction: direction,
          reason: direction === "OUT" ? reason : undefined,
          gateId: gateId,
          isManual: true,
        }),
      });

      const scanData = await scanRes.json();
      if (scanData.success) {
        addToast({
          title: "Manual Entry Recorded",
          message: `${student.name} (${student.roll}) has been recorded ${direction === "IN" ? "entering" : "exiting"} campus.`,
          variant: "success",
        });
        onClose();
        reset();
      } else {
        addToast({
          title: "Manual Entry Failed",
          message: scanData.error?.message || "Could not record the scan.",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Manual entry error:", error);
      addToast({
        title: "Error",
        message: "An unexpected error occurred. Please try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setRollInput("");
    setStudent(null);
    setStep("input");
    setDirection("IN");
    setReason(null);
    setPin("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Manual Roll Entry</h3>
                <p className="text-xs text-[var(--text-muted)]">Verified Operator Terminal Query</p>
              </div>
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step: Standard Input */}
            {step === "input" && (
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    JNTUH Student Roll Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      value={rollInput}
                      onChange={(e) => setRollInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 24JJ1A0501"
                      autoFocus
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-base font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-3.5 text-[var(--text-muted)]" />
                    {rollInput && (
                      <button
                        type="button"
                        onClick={() => setRollInput("")}
                        className="absolute right-3 top-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Decoded roll info (shows when valid) */}
                {rollInput && rollValid && rollDecoded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-[var(--action-primary)]/5 border border-[var(--action-primary)]/20 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--action-primary)]">
                      <span>Verified JNTUH Structure</span>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[var(--text-muted)]">Batch:</span>{" "}
                        <span className="text-[var(--text-primary)] font-semibold">{rollDecoded.admissionYear}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">College:</span>{" "}
                        <span className="text-[var(--text-primary)] font-semibold">{rollDecoded.collegeCode}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Dept:</span>{" "}
                        <span className="text-[var(--text-primary)] font-semibold">{rollDecoded.department}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Branch:</span>{" "}
                        <span className="text-[var(--text-primary)] font-semibold">{rollDecoded.branch}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Invalid roll notification */}
                {rollInput && !rollValid && (
                  <div className="p-3 bg-[var(--action-danger)]/10 border border-[var(--action-danger)]/20 rounded-xl flex items-start gap-2 text-xs text-[var(--action-danger)]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Roll number format must be 10 characters (e.g. 24JJ1A0501).</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="rounded-xl px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!rollInput || !rollValid || searching}
                    loading={searching}
                    className="rounded-xl px-6 flex items-center gap-2"
                  >
                    <span>Fetch Record</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step: Confirm student */}
            {step === "confirm" && student && (
              <div className="space-y-5">
                <div className="flex items-center gap-4 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center shrink-0">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-[var(--text-primary)]">{student.name}</h4>
                    <p className="font-mono text-xs font-semibold text-[var(--action-primary)]">{student.roll}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {student.department} • Year {student.year}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Scan Direction
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDirection("IN")}
                      className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        direction === "IN"
                          ? "bg-[var(--action-primary)] text-white shadow-md"
                          : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                      }`}
                    >
                      <span>🟢 ENTRY (IN)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection("OUT")}
                      className={`py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        direction === "OUT"
                          ? "bg-[var(--action-danger)] text-white shadow-md"
                          : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                      }`}
                    >
                      <span>🔴 EXIT (OUT)</span>
                    </button>
                  </div>
                </div>

                {direction === "OUT" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                      Campus Exit Reason
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Home Out", "Day Out", "Leave", "Regular"].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(r as ExitReason)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                            reason === r
                              ? "bg-[var(--action-primary)] text-white shadow-xs"
                              : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supervisor PIN entry */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Supervisor PIN (required for manual entry)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="w-full py-3 px-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-center font-mono font-bold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                  />
                  <p className="text-xs text-[var(--text-muted)]">
                    Enter 4-digit supervisor PIN to authorize this manual entry.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep("input")} className="flex-1 rounded-xl">
                    Back
                  </Button>
                  <Button
                    onClick={handlePinConfirm}
                    disabled={submitting || pin.length !== 4}
                    loading={submitting}
                    className="flex-1 rounded-xl font-bold"
                  >
                    Authorize Entry
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
