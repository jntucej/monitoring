"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check } from "lucide-react";
import { findStudentByRoll, verifyPin, findUserById } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ScanDirection, ExitReason } from "@/lib/types";

interface ManualEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gateId: string;
}

const NUMPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"];

export function ManualEntryDialog({ isOpen, onClose, gateId }: ManualEntryDialogProps) {
  const [rollInput, setRollInput] = useState("");
  const [step, setStep] = useState<"keypad" | "confirm" | "pin">("keypad");
  const [student, setStudent] = useState<any>(null);
  const [direction, setDirection] = useState<ScanDirection>("IN");
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [pin, setPin] = useState("");
  const [searching, setSearching] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === "⌫") {
      setRollInput((prev) => prev.slice(0, -1));
    } else if (rollInput.length < 12) {
      setRollInput((prev) => prev + key);
    }
  };

  const handleSearch = () => {
    if (!rollInput.trim()) return;
    setSearching(true);
    const found = findStudentByRoll(rollInput);
    setSearching(false);
    if (found) {
      setStudent(found);
      setStep("confirm");
    }
  };

  const handleManualScan = () => {
    setStep("pin");
  };

  const handlePinConfirm = () => {
    if (pin.length !== 4) return;
    const op = findUserById("op-1");
    if (op && op.pin && verifyPin(op.id, pin)) {
      // In a real app, this would call the API with isManual=true
      onClose();
      // Reset state
      setRollInput("");
      setStudent(null);
      setStep("keypad");
      setPin("");
    }
  };

  const reset = () => {
    setRollInput("");
    setStudent(null);
    setStep("keypad");
    setPin("");
    setDirection("IN");
    setReason(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manual Entry</h3>
              <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step: Keypad */}
            {step === "keypad" && (
              <>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Enter student roll number:
                </p>
                <div className="bg-[var(--bg-base)] border-2 border-[var(--border)] rounded-lg p-3 mb-4 min-h-[48px] flex items-center">
                  <span className="font-mono text-xl text-[var(--text-primary)]">
                    {rollInput || <span className="text-[var(--text-muted)]">—</span>}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {NUMPAD.map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(key)}
                      className="h-12 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-lg font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={!rollInput || searching}
                  className="w-full h-12"
                  loading={searching}
                >
                  {searching ? "Searching..." : "Search Student"}
                </Button>
              </>
            )}

            {/* Step: Confirm student */}
            {step === "confirm" && student && (
              <>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 bg-[var(--bg-base)] flex items-center justify-center">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👤</span>
                    )}
                  </div>
                  <h4 className="font-bold text-lg">{student.name}</h4>
                  <p className="text-[var(--text-secondary)] font-mono">{student.roll}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {student.department} • Year {student.year}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 uppercase">
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDirection("IN")}
                      className={`h-12 rounded-lg font-medium transition-all ${
                        direction === "IN"
                          ? "bg-[var(--action-primary)] text-white"
                          : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      🟢 ENTRY
                    </button>
                    <button
                      onClick={() => setDirection("OUT")}
                      className={`h-12 rounded-lg font-medium transition-all ${
                        direction === "OUT"
                          ? "bg-[var(--action-danger)] text-white"
                          : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      🔴 EXIT
                    </button>
                  </div>
                </div>

                {direction === "OUT" && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-2 uppercase">
                      Exit Reason
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Home Out", "Day Out", "Leave", "Regular"].map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r as ExitReason)}
                          className={`h-12 rounded-lg text-sm font-medium transition-all ${
                            reason === r
                              ? "bg-[var(--action-primary)] text-white"
                              : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep("keypad")} className="flex-1 h-12">
                    Back
                  </Button>
                  <Button onClick={handleManualScan} className="flex-1 h-12">
                    Proceed (PIN Required)
                  </Button>
                </div>
              </>
            )}

            {/* Step: PIN entry */}
            {step === "pin" && (
              <>
                <p className="text-sm text-[var(--text-secondary)] mb-2">
                  Enter supervisor PIN to confirm manual entry:
                </p>
                <div className="bg-[var(--bg-base)] border-2 border-[var(--border)] rounded-lg p-3 mb-4 min-h-[48px] flex items-center">
                  <span className="font-mono text-xl text-[var(--text-primary)] tracking-widest">
                    {pin || <span className="text-[var(--text-muted)]">— — — —</span>}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"].map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (key === "⌫") {
                          setPin((prev) => prev.slice(0, -1));
                        } else if (pin.length < 4) {
                          setPin((prev) => prev + key);
                        }
                      }}
                      className="h-12 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-lg font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep("confirm")} className="flex-1 h-12">
                    Back
                  </Button>
                  <Button
                    onClick={handlePinConfirm}
                    disabled={pin.length !== 4}
                    className="flex-1 h-12"
                  >
                    Confirm
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
