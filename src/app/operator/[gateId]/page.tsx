"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Power, RefreshCw, Wifi, WifiOff, AlertTriangle, User } from "lucide-react";
import { COLLEGE } from "@/lib/db";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { ManualEntryDialog } from "@/components/operator/ManualEntryDialog";
import { LastScanCard } from "@/components/operator/LastScanCard";
import { OperatorStats } from "@/components/operator/OperatorStats";
import type { ScanDirection, ExitReason } from "@/lib/types";

const GATE_NAMES: Record<string, string> = {
  "gate-1": "Gate 1 (Main)",
  "gate-2": "Gate 2 (Hostel)",
  "gate-3": "Gate 3 (Back Gate)",
};

const SAMPLE_ROLLS = ["21CSE101", "21ECE102", "21IT103", "21EEE104", "21ME105", "21CSE106", "21ECE107"];

export default function OperatorPage() {
  const params = useParams<{ gateId: string }>();
  const gateId = params?.gateId || "gate-1";
  const { user, authenticated, loginAsRole } = useAuth();
  const {
    state,
    currentStudent,
    selectedDirection,
    selectedReason,
    photoVerificationDone,
    lastScan,
    todaysStats,
    recentScans,
    error,
    isOnline,
    startScan,
    setDirection,
    setReason,
    confirmScan,
    cancelScan,
    reset,
    setGate,
    setOnline,
  } = useOperatorStore();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [tripleTapCount, setTripleTapCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      loginAsRole("operator");
    }
    setGate(gateId);
    reset();
  }, [authenticated, gateId, loginAsRole, setGate, reset]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [setOnline]);

  const handleTripleTap = () => {
    setTripleTapCount((prev) => prev + 1);
    setTimeout(() => setTripleTapCount(0), 1500);
  };

  useEffect(() => {
    if (tripleTapCount >= 3) {
      setShowLogoutConfirm(true);
      setTripleTapCount(0);
    }
  }, [tripleTapCount]);

  const gateName = GATE_NAMES[gateId] || gateId;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-6 border-b border-[var(--border)] bg-[var(--bg-surface)]/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏛️</span>
          <span className="font-bold text-sm">{COLLEGE.shortName}</span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="text-sm font-medium text-[var(--focus-ring)]">{gateName}</span>
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleTripleTap}>
          <span className="text-xs text-[var(--text-muted)]">👤 {user?.name || "Op #3"}</span>
          <span className="text-xs text-[var(--text-muted)]">🔋 85%</span>
          {isOnline ? (
            <Wifi className="w-4 h-4 text-[var(--action-primary)]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[var(--action-warning)]" />
          )}
          <Power className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      </header>

      {/* Camera / Scan Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full">
          {state === "success" && <SuccessFlash />}

          {state === "error" && error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center bg-red-500/10 border-2 border-red-500/30 rounded-xl"
            >
              <AlertTriangle className="w-12 h-12 text-[var(--action-danger)] mb-4" />
              <p className="text-xl font-bold text-[var(--action-danger)]">{error.code}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-2">{error.message}</p>
            </motion.div>
          )}

          {state === "confirming" && currentStudent && (
            <ScanConfirmationModal
              student={currentStudent}
              selectedDirection={selectedDirection}
              selectedReason={selectedReason}
              onDirectionSelect={setDirection}
              onConfirm={confirmScan}
              onCancel={cancelScan}
              onReasonSelect={setReason}
            />
          )}

          {state !== "success" && state !== "error" && state !== "confirming" && (
            <CameraViewfinder
              onScan={startScan}
              scanning={state === "detecting"}
              sampleRolls={SAMPLE_ROLLS}
            />
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <LastScanCard lastScan={lastScan} />
            {todaysStats && (
              <OperatorStats
                entries={todaysStats.entries}
                exits={todaysStats.exits}
                onCampus={todaysStats.onCampus}
              />
            )}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
              <button
                onClick={() => setShowManualEntry(true)}
                className="w-full h-12 px-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--border-strong)] transition-colors flex items-center justify-center gap-2"
              >
                <span>🔲</span> Manual Entry
              </button>
              <button
                onClick={reset}
                className="w-full h-10 px-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:text-[var(--action-primary)] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Stats
              </button>
              {!isOnline && useOperatorStore.getState().offlineQueue.length > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-[var(--action-warning)]/10 border border-[var(--action-warning)]/30 text-[var(--action-warning)] text-xs flex items-center gap-2">
                  <span>📡</span>
                  Offline — {useOperatorStore.getState().offlineQueue.length} scans queued
                </div>
              )}
            </div>
          </div>

          {/* Recent Scans */}
          <div className="mt-4">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">
              RECENT SCANS (last 5)
            </p>
            <div className="space-y-1.5">
              {recentScans.length > 0 ? (
                recentScans.slice(0, 5).map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between py-2 px-3 bg-[var(--bg-base)]/50 rounded-lg border border-[var(--border)]/40"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge direction={scan.direction} reason={scan.reason as any} size="sm" />
                      <span className="font-mono text-xs text-[var(--text-secondary)]">{scan.roll}</span>
                      <span className="text-sm font-medium">{scan.name}</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)] py-4 text-center">No scans yet today</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ManualEntryDialog
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        gateId={gateId}
      />

      {/* Logout Confirmation (triple-tap) */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Confirm Logout</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                You are about to log out of the Gate Operator session. Continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-11 px-4 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => loginAsRole("operator").then(() => setShowLogoutConfirm(false))}
                  className="flex-1 h-11 px-4 rounded-lg bg-[var(--action-danger)] text-white font-medium hover:bg-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Camera viewfinder with scan reticle and sample roll buttons */
function CameraViewfinder({
  onScan,
  scanning,
  sampleRolls,
}: {
  onScan: (roll: string) => void;
  scanning: boolean;
  sampleRolls: string[];
}) {
  return (
    <div className="relative h-full min-h-[360px] bg-black rounded-xl overflow-hidden border-2 border-[var(--border)]">
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <CameraIcon className="w-16 h-16 text-[var(--text-muted)]/30" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[var(--text-muted)]">
          <ScanLineIcon className="w-4 h-4 animate-pulse" />
          <span className="text-xs">Camera Active</span>
        </div>
      </div>

      {/* Scan Ring reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-64 h-64">
          <motion.div
            className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[var(--action-primary)] rounded-tl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[var(--action-primary)] rounded-tr-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[var(--action-primary)] rounded-bl-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[var(--action-primary)] rounded-br-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-[var(--action-primary)]/60"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-white/80 text-sm mb-2">Align QR within frame</p>
            <p className="text-white/50 text-xs">Place student ID card here</p>
          </div>
        </div>
      </div>

      {/* Sample roll buttons (demo mode) */}
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-surface)]/80 backdrop-blur border-t border-[var(--border)] p-3 flex flex-wrap justify-center gap-2">
        {sampleRolls.map((roll) => (
          <button
            key={roll}
            type="button"
            onClick={() => !scanning && onScan(roll)}
            disabled={scanning}
            className="px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:border-[var(--action-primary)] hover:text-[var(--action-primary)] transition-colors disabled:opacity-40"
          >
            {roll}
          </button>
        ))}
        <span className="text-xs text-[var(--text-muted)] w-full mt-1">Tap a roll to simulate QR scan</span>
      </div>
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v18M3 16.5V7.5M3 16.5l4.5 4.5m0-12L3 3m4.5 4.5L12 7.5m-4.5 0v9m0-9L3 7.5m4.5 0L12 7.5m0 0v9" />
    </svg>
  );
}

function ScanLineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v18M3 16.5V7.5M3 16.5l4.5 4.5m0-12L3 3m4.5 4.5L12 7.5" />
    </svg>
  );
}

/** Scan confirmation modal with photo verification lock */
function ScanConfirmationModal({
  student,
  selectedDirection,
  selectedReason,
  onDirectionSelect,
  onConfirm,
  onCancel,
  onReasonSelect,
}: {
  student: any;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  onDirectionSelect: (dir: ScanDirection) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReasonSelect: (reason: ExitReason) => void;
}) {
  const [photoTimer, setPhotoTimer] = useState(2);
  const [confirmStep, setConfirmStep] = useState<"photo" | "direction" | "reason">("photo");

  useEffect(() => {
    if (confirmStep === "photo") {
      const timer = setInterval(() => {
        setPhotoTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setConfirmStep("direction");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [confirmStep]);

  const reasonOptions: { val: ExitReason; label: string; color: string }[] = [
    { val: "Home Out", label: "🏠 Home Out", color: "bg-[var(--action-danger)]" },
    { val: "Day Out", label: "☀️ Day Out", color: "bg-[var(--action-warning)]" },
    { val: "Leave", label: "📝 Leave", color: "bg-[var(--action-info)]" },
    { val: "Regular", label: "🚶 Regular", color: "bg-[var(--action-danger)]" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Student Photo with verification lock */}
          <div className="relative mx-auto w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--border)] mb-4">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-base)]">
                <User className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
            )}
            {confirmStep === "photo" && photoTimer > 0 && (
              <div className="absolute -inset-1 rounded-full border-2 border-[var(--focus-ring)] animate-pulse" />
            )}
          </div>

          {/* Countdown overlay */}
          {confirmStep === "photo" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/70 flex items-center justify-center text-white text-2xl font-bold">
                {photoTimer}
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-1">{student.name}</h2>
          <p className="text-[var(--text-secondary)] font-mono">{student.roll}</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {student.department} • Year {student.year}
          </p>

          {confirmStep === "photo" ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Verifying student identity... ({photoTimer}s)
            </p>
          ) : confirmStep === "direction" ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-4">Is this student ENTERING or EXITING?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onDirectionSelect("IN")}
                  className="h-14 px-4 rounded-lg bg-[var(--action-primary)] text-white font-semibold text-lg hover:brightness-110 transition-all active:scale-[0.98]"
                >
                  🟢 ENTRY
                </button>
                <button
                  onClick={() => onDirectionSelect("OUT")}
                  className="h-14 px-4 rounded-lg bg-[var(--action-danger)] text-white font-semibold text-lg hover:brightness-110 transition-all active:scale-[0.98]"
                >
                  🔴 EXIT
                </button>
              </div>
              <button
                onClick={onCancel}
                className="mt-4 w-full h-10 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </>
          ) : confirmStep === "reason" ? (
            <>
              <p className="text-sm text-[var(--text-muted)] mb-4">Select reason for exit:</p>
              <div className="grid grid-cols-2 gap-2">
                {reasonOptions.map((r) => (
                  <button
                    key={r.val}
                    onClick={() => onReasonSelect(r.val)}
                    className={`h-12 px-3 rounded-lg text-white font-medium text-sm ${r.color} hover:brightness-110 transition-all active:scale-[0.98]`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setConfirmStep("direction")}
                className="mt-3 w-full h-10 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ← Back
              </button>
            </>
          ) : null}
        </div>

        {confirmStep === "direction" && selectedDirection === "IN" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onConfirm}
            className="mt-4 w-full h-14 rounded-lg bg-[var(--action-primary)] text-white font-bold text-xl hover:brightness-110 transition-all active:scale-[0.98]"
          >
            ✅ CONFIRM ENTRY
          </motion.button>
        )}

        {confirmStep === "direction" && selectedDirection === "OUT" && selectedReason && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onConfirm}
            className="mt-4 w-full h-14 rounded-lg bg-[var(--action-danger)] text-white font-bold text-xl hover:brightness-110 transition-all active:scale-[0.98]"
          >
            🚪 CONFIRM EXIT
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
