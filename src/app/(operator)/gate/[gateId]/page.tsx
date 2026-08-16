"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Power, RefreshCw, Wifi, WifiOff, AlertCircle, Scan, KeyRound, ArrowUpRight, ArrowDownLeft, UserCheck, ShieldCheck } from "lucide-react";
import { COLLEGE } from "@/lib/db";
import { SAMPLE_ROLL_NUMBERS } from "@/lib/rollNumber";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { ManualEntryDialog } from "@/components/operator/ManualEntryDialog";
import { ScanConfirmation } from "@/components/operator/ScanConfirmation";
import { Scanner } from "@/components/operator/Scanner";
import { ScanViewfinder } from "@/components/operator/ScanViewfinder";

const GATE_NAMES: Record<string, string> = {
  "gate-1": "Gate 1 (Main Gate)",
  "gate-2": "Gate 2 (Hostel Gate)",
  "gate-3": "Gate 3 (Back Gate)",
  "1": "Gate 1 (Main Gate)",
  "2": "Gate 2 (Hostel Gate)",
  "3": "Gate 3 (Back Gate)",
};

export default function OperatorPage() {
  const params = useParams<{ gateId: string }>();
  const gateId = params?.gateId || "gate-1";
  const { user, authenticated, loginAsRole, logout } = useAuth();
  const {
    state,
    currentStudent,
    lastScan,
    todaysStats,
    recentScans,
    error,
    isOnline,
    startScan,
    confirmScan,
    cancelScan,
    reset,
    setGate,
    setOnline,
  } = useOperatorStore();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
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

  const gateName = GATE_NAMES[gateId] || `Gate ${gateId}`;

  const handleQRScanned = (scannedPayload: string) => {
    // Process untrusted scanned string (roll number or encoded pass JSON/token)
    let rollCandidate = scannedPayload.trim();
    
    // If QR payload is JSON or token containing roll number, parse safely
    if (rollCandidate.startsWith("{")) {
      try {
        const parsed = JSON.parse(rollCandidate);
        if (parsed.roll) rollCandidate = parsed.roll;
        else if (parsed.student_roll) rollCandidate = parsed.student_roll;
      } catch {
        // Fallback to raw string
      }
    }

    startScan(rollCandidate);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] pb-safe">
      {/* Header Bar */}
      <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-[var(--border)] bg-[var(--bg-surface)] flex-shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)] flex items-center justify-center font-bold text-xs border border-[var(--action-primary)]/20">
            J
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] leading-none">
              {COLLEGE.shortName}
            </h1>
            <p className="text-[11px] text-[var(--action-primary)] font-medium mt-0.5">
              {gateName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-emerald-400">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-amber-400">Offline Queue</span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Operator sign out"
            className="w-9 h-9 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--action-danger)] flex items-center justify-center transition-colors"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Operational Mobile Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Dominant Primary Action CTA: SCAN ID */}
        {state !== "confirming" && state !== "success" && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCameraScanner(true)}
            className="w-full h-14 rounded-2xl bg-[var(--action-primary)] hover:bg-emerald-400 text-slate-950 font-extrabold text-lg flex items-center justify-center gap-3 shadow-xl transition-all"
          >
            <Scan className="w-6 h-6 stroke-[2.5]" />
            <span>SCAN STUDENT ID</span>
          </motion.button>
        )}

        {/* Today's Operational Summary Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3.5 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Entries Today
            </span>
            <span className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-400 mt-1 block">
              {todaysStats?.entries ?? 0}
            </span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3.5 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Exits Today
            </span>
            <span className="text-xl sm:text-2xl font-bold tabular-nums text-rose-400 mt-1 block">
              {todaysStats?.exits ?? 0}
            </span>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3.5 text-center">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              On Campus
            </span>
            <span className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--text-primary)] mt-1 block">
              {todaysStats?.onCampus ?? 0}
            </span>
          </div>
        </div>

        {/* Success Visual Flash */}
        {state === "success" && <SuccessFlash />}

        {/* Operational Exceptions & Error States */}
        {state === "error" && error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2"
          >
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-rose-400">Scan Verification Exception</h3>
            <p className="text-xs text-[var(--text-secondary)]">{error.message}</p>
            <button
              onClick={reset}
              className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors"
            >
              Resume Scanning
            </button>
          </motion.div>
        )}

        {/* Scan Confirmation Verification Interface */}
        {state === "confirming" && currentStudent && (
          <ScanConfirmation
            student={currentStudent}
            onConfirm={(dir) => confirmScan()}
            onCancel={cancelScan}
          />
        )}

        {/* Primary Viewfinder & Scanner Desk */}
        {state !== "success" && state !== "error" && state !== "confirming" && (
          <div className="space-y-4">
            <ScanViewfinder
              onStartScanner={() => setShowCameraScanner(true)}
              onManualEntry={() => setShowManualEntry(true)}
              scanning={state === "detecting"}
              lastScanRoll={lastScan?.roll}
              sampleRolls={SAMPLE_ROLL_NUMBERS.slice(0, 3)}
              onSampleScan={(roll) => startScan(roll)}
            />

            {/* Manual Roll Number Trigger */}
            <button
              onClick={() => setShowManualEntry(true)}
              className="w-full py-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--border-strong)] transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Manual Roll Number Entry</span>
            </button>
          </div>
        )}

        {/* Recent Operational Activity Stream */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Recent Activity
            </h2>
            <button
              onClick={reset}
              aria-label="Refresh operational statistics"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="space-y-2">
            {recentScans.length > 0 ? (
              recentScans.slice(0, 4).map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {scan.direction === "IN" ? (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{scan.name}</p>
                      <p className="font-mono text-[11px] text-[var(--text-muted)]">{scan.roll}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-[var(--text-muted)] py-4">No gate scans recorded yet today.</p>
            )}
          </div>
        </div>
      </main>

      {/* Live Camera Scanner Modal */}
      <Scanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleQRScanned}
        onManualEntryClick={() => setShowManualEntry(true)}
      />

      {/* Manual Entry Dialog */}
      <ManualEntryDialog
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        gateId={gateId}
      />

      {/* Logout Confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl p-6 max-w-xs w-full text-center space-y-4 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Sign Out of Gate Desk?</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Your active scanning session will be securely closed on this device.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    await logout();
                    window.location.href = "/login";
                  }}
                  className="py-2.5 rounded-xl bg-[var(--action-danger)] text-white text-xs font-semibold"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
