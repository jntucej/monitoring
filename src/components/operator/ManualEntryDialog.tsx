"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Info, User, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import { parseRollNumber, validateRollNumber } from "@/lib/rollNumber";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import type { ScanDirection, ExitReason } from "@/lib/types";

import { useCampusConfig } from "@/hooks/useCampusConfig";
import { getClientLocation, getClientSysTag } from "@/lib/geo";

interface ManualEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gateId: string;
}

export function ManualEntryDialog({ isOpen, onClose, gateId }: ManualEntryDialogProps) {
  const { exitReasons } = useCampusConfig();
  const validExitReasons = exitReasons.length > 0 ? exitReasons : [];
  
  const [rollInput, setRollInput] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [student, setStudent] = useState<any>(null);
  const [direction, setDirection] = useState<ScanDirection>("IN");
  const [reason, setReason] = useState<ExitReason | null>(null);
  const [searching, setSearching] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvedPasses, setApprovedPasses] = useState<any[]>([]);
  const [loadingPasses, setLoadingPasses] = useState(false);

  const { addToast } = useUIStore();

  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    updateHeight();
    window.visualViewport.addEventListener("resize", updateHeight);
    window.visualViewport.addEventListener("scroll", updateHeight);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("scroll", updateHeight);
    };
  }, []);

  useEffect(() => {
    if (!student) {
      setApprovedPasses([]);
      return;
    }
    const fetchApprovedPasses = async () => {
      const rollNum = student.uniqueId || student.roll || student.id;
      if (!rollNum) return;
      setLoadingPasses(true);
      try {
        const res = await fetch(`/api/passes?roll=${encodeURIComponent(rollNum)}`);
        if (res.ok) {
          const json = await res.json();
          const rawList = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
          const validPasses = rawList.filter((p: any) => {
            const status = (p.final_status || p.status || "").toUpperCase();
            return ["APPROVED", "APPROVED_PARENT", "APPROVED_ADMIN"].includes(status);
          });
          setApprovedPasses(validPasses);
        } else {
          setApprovedPasses([]);
        }
      } catch (err) {
        console.error("Error loading approved passes:", err);
      } finally {
        setLoadingPasses(false);
      }
    };
    fetchApprovedPasses();
  }, [student]);

  // Real-time roll-number validation & decoding
  const rollValid = useMemo(() => (rollInput ? validateRollNumber(rollInput) : false), [rollInput]);
  const rollDecoded = useMemo(() => (rollInput ? parseRollNumber(rollInput) : null), [rollInput]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = rollInput.trim().toUpperCase();
    if (!cleanInput) return;

    const isKnownPrefix = ["FAC", "STF", "EMP", "HOD", "SUP", "ADM", "WDN", "WRK", "VIS", "F-", "E-", "H-", "S-", "FAC-", "STF-", "EMP-", "HOD-", "SUP-", "ADM-", "WDN-", "WRK-", "VIS-"].some((p) => cleanInput.startsWith(p));
    if (!isKnownPrefix && !validateRollNumber(cleanInput)) {
      addToast({
        title: "Invalid Roll Format",
        message: `"${cleanInput}" does not match the expected 10-character roll number schema (e.g. 24JJ1A0501).`,
        variant: "error",
      });
      return;
    }

    setSearching(true);
    let found = null;
    try {
      const authState = useAuthStore.getState();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authState.token) headers["Authorization"] = `Bearer ${authState.token}`;
      if (authState.user?.currentSessionToken) headers["X-Session-Token"] = authState.user.currentSessionToken;

      const res = await fetch(`/api/persons?uniqueId=${encodeURIComponent(cleanInput)}`, { headers });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        found = json.data;
      }
    } catch (err) {
      console.error("Error fetching person by roll:", err);
    }
    setSearching(false);
    if (found) {
      setStudent(found);
      setStep("confirm");
    } else {
      addToast({
        title: "Person Not Found",
        message: `No registered student or user found matching ID "${cleanInput}".`,
        variant: "error",
      });
    }
  };

  const handlePinConfirm = async () => {
    if (pin.length !== 4) {
      addToast({
        title: "Invalid PIN",
        message: "Please enter a valid 4-digit admin PIN.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Get current user info to try PIN verification with their ID first, then fallbacks
      const currentUser = useUIStore.getState(); // or auth store
      const authStore = (await import("@/stores/authStore")).useAuthStore.getState();
      const user = authStore.user;

      const candidates = [
        user?.employeeId,
        user?.uniqueId,
        user?.email,
      ].filter((val): val is string => Boolean(val && val.trim()));

      if (candidates.length === 0) {
        addToast({
          title: "Configuration Error",
          message: "No user identifier found for PIN verification.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }

      let verifyData: any = null;

      for (const empId of candidates) {
        const verifyRes = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: empId, pin, verifyOnly: true }),
        });
        const json = await verifyRes.json();
        if (json.success) {
          verifyData = json;
          break;
        }
      }

      if (!verifyData || !verifyData.success) {
        addToast({
          title: "PIN Verification Failed",
          message: "Invalid admin PIN. Please try again.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }

      // Get the authenticated admin ID from the token
      const token = verifyData.data.token;

      // Get client GPS geolocation & system tag
      const geo = await getClientLocation();
      const sysTag = getClientSysTag();

      // Check online status
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        addToast({
          title: "Server Connection Required",
          message: "Action blocked: Active live server API connection is strictly required.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }

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
          sysTag,
          geo,
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
            style={{ maxHeight: viewportHeight ? `${viewportHeight - 32}px` : "calc(100dvh - 2rem)" }}
            className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full max-h-[calc(100dvh-2rem)] shadow-2xl overflow-y-auto overscroll-y-contain custom-scrollbar"
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
                aria-label="Close dialog"
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step: Standard Input */}
            {step === "input" && (
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                    Student Roll Number
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
                      <span>Verified Institutional Structure</span>
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
                  <div className="space-y-4">
                    {/* Active Permissions / Passes Section */}
                    {(student.personType === "student" || !student.personType) && (
                      <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl p-3.5 space-y-2 text-left">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-muted)] block">
                          Approved Exit Passes ({approvedPasses.length})
                        </span>
                        {loadingPasses ? (
                          <p className="text-xs text-[var(--text-muted)] animate-pulse">Checking gate pass database...</p>
                        ) : approvedPasses.length > 0 ? (
                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                            {approvedPasses.map((pass) => (
                              <div key={pass.id} className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-lg text-xs">
                                <div>
                                  <span className="font-bold text-emerald-400">{pass.reason}</span>
                                  <span className="text-[10px] text-[var(--text-muted)] ml-2">
                                     until {new Date(pass.to_datetime).toLocaleDateString()}
                                  </span>
                                </div>
                                <span className="font-extrabold text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Approved
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--text-muted)] italic">No active approved exit passes found in database.</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase">
                        Campus Exit Reason
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {["Home Out", "Day Out", "Leave", "Regular"].map((r) => {
                          const config = validExitReasons.find((c) => c.code === r);
                          const requiresApproval = config?.requiresApproval ?? false;
                          const passRequired = requiresApproval && (student.personType === "student" || !student.personType);
                          const hasApprovedPass = approvedPasses.some((p) => p.reason === r);
                          const isDisabled = passRequired && !hasApprovedPass;

                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setReason(r as ExitReason)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                                reason === r
                                  ? "bg-[var(--action-primary)] text-white shadow-xs"
                                  : isDisabled
                                    ? "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                                    : "bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                              }`}
                            >
                              <span>{r}</span>
                              {passRequired && (
                                <span className={`text-[8px] font-extrabold px-1 rounded border scale-90 ${
                                  hasApprovedPass
                                    ? reason === r ? "bg-white/20 text-white border-white/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                }`}>
                                  {hasApprovedPass ? "Pass Active" : "No Pass"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin PIN entry */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Admin PIN (required for manual entry)
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full py-3 px-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-center font-mono font-bold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3.5 top-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors p-1"
                      aria-label={showPin ? "Hide PIN" : "Show PIN"}
                    >
                      {showPin ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Enter 4-digit admin PIN to authorize this manual entry.
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
