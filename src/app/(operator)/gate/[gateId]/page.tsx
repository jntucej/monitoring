"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, Wifi, WifiOff, AlertCircle, Scan, KeyRound, UserCheck, LayoutDashboard, Clock, User as UserIcon } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { ScanConfirmation } from "@/components/operator/ScanConfirmation";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { ScanViewfinder } from "@/components/operator/ScanViewfinder";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { RecentScans } from "@/components/operator/RecentScans";
import { OperatorStats } from "@/components/operator/OperatorStats";

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
  const searchParams = useSearchParams();
  
  const gateId = params?.gateId || "1";
  const currentTab = searchParams?.get("tab") || "scandesk";
  
  const { authenticated } = useAuth();
  const { addToast } = useToast();
  const operatorStore = useOperatorStore();
  const {
    state,
    currentStudent,
    lastScan,
    todaysStats,
    recentScans,
    isOnline,
    error,
    startScan,
    cancelScan,
    reset,
    setGate,
    setOnline,
    flushOfflineQueue,
  } = operatorStore;
  const confirmScan = operatorStore.confirmScan;

  // Local active tab for the desk panel: scan, manual, entry
  const [operatorSubMode, setOperatorSubMode] = useState<"scan" | "manual" | "entry">("scan");
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [manualRollInput, setManualRollInput] = useState("");

  // Derive effective sub-mode: when a scan flow is active, force the
  // "entry" tab so the user sees the confirmation/success/error UI.
  const effectiveSubMode =
    state === "confirming" || state === "success" || state === "error"
      ? ("entry" as const)
      : operatorSubMode;

  // When a scan is active, redirect away from query param tabs to keep
  // the URL clean and consistent with the visible desk view.
  useEffect(() => {
    if ((state === "confirming" || state === "success" || state === "error") && searchParams?.get("tab")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.pushState({}, "");
    }
  }, [state, searchParams]);

  // Ref to prevent double initialization
  const gateInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    if (gateInitializedRef.current === gateId) return;
    gateInitializedRef.current = gateId;

    setGate(gateId);
    reset();
  }, [authenticated, gateId, setGate, reset]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      // Flush any queued offline scans when we regain connectivity
      flushOfflineQueue();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [setOnline, flushOfflineQueue]);

  const gateName = GATE_NAMES[gateId] || `Gate ${gateId}`;

  const handleQRScanned = (scannedPayload: string) => {
    let rollCandidate = scannedPayload.trim();
    if (rollCandidate.startsWith("{")) {
      try {
        const parsed = JSON.parse(rollCandidate);
        if (parsed.roll) rollCandidate = parsed.roll;
        else if (parsed.student_roll) rollCandidate = parsed.student_roll;
      } catch {
        // use raw
      }
    }
    startScan(rollCandidate);
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case "stats":
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Gate Flow Analytics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <OperatorStats
                entries={todaysStats?.entries ?? 0}
                exits={todaysStats?.exits ?? 0}
                onCampus={todaysStats?.onCampus ?? 0}
              />
            </div>
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] space-y-3">
              <h3 className="font-bold text-sm">Desk Statistics Information</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Aggregated values are refreshed live from the backend API of JNTUH CEJ. Offline movements will sync automatically when status switches to online.
              </p>
            </div>
          </div>
        );

      case "history":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--action-primary)]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Operational History</h2>
              </div>
              <button
                onClick={reset}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" /> Refresh Logs
              </button>
            </div>
            <RecentScans scans={recentScans} />
          </div>
        );

      case "profile":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 justify-center">
              <UserIcon className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Warden / Guard Settings</h2>
            </div>
            <UserProfileTab />
          </div>
        );

      case "scandesk":
      default:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Operational Mode Navigation */}
            <div className="flex bg-[var(--bg-surface)] p-1.5 rounded-2xl border border-[var(--border)] gap-1 shadow-sm">
              <button
                onClick={() => setOperatorSubMode("scan")}
                className={`flex-grow py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  operatorSubMode === "scan"
                    ? "bg-[var(--action-primary)] text-slate-950 shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>Scan QR</span>
              </button>
              <button
                onClick={() => setOperatorSubMode("manual")}
                className={`flex-grow py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  operatorSubMode === "manual"
                    ? "bg-[var(--action-primary)] text-slate-950 shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>Manual Enter</span>
              </button>
              <button
                onClick={() => setOperatorSubMode("entry")}
                className={`flex-grow relative py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  operatorSubMode === "entry"
                    ? "bg-[var(--action-primary)] text-slate-950 shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Entry Details</span>
                {(state === "confirming" || state === "error") && (
                  <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border-2 border-[var(--bg-surface)]" />
                )}
              </button>
            </div>

            {/* Switchable Workspace */}
            <div className="min-h-[220px]">
              {effectiveSubMode === "scan" && (
                <ScanViewfinder
                  onStartScanner={() => setShowCameraScanner(true)}
                  onManualEntry={() => setOperatorSubMode("manual")}
                  scanning={state === "detecting"}
                  lastScanRoll={lastScan?.roll}
                />
              )}

              {effectiveSubMode === "manual" && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Manual Student Lookup</h3>
                    <p className="text-xs text-[var(--text-muted)]">Type student roll number to check gate pass permission</p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualRollInput.trim()) {
                        startScan(manualRollInput.trim().toUpperCase());
                      }
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      maxLength={10}
                      value={manualRollInput}
                      onChange={(e) => setManualRollInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 24JJ1A0501"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-base font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
                    />

                    <button
                      type="submit"
                      disabled={!manualRollInput.trim() || state === "detecting"}
                      className="w-full py-3.5 px-4 rounded-xl bg-[var(--action-primary)] border border-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                    >
                      <KeyRound className="w-5 h-5" />
                      <span>Verify Roll Number</span>
                    </button>
                  </form>
                </div>
              )}

              {effectiveSubMode === "entry" && (
                <div className="space-y-4">
                  {/* Success Visual Flash */}
                  {state === "success" && (
                    <div className="space-y-4">
                      <SuccessFlash />
                      <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-center space-y-2">
                        <p className="text-xs text-emerald-400 font-semibold">Movement Recorded Successfully</p>
                        <button
                          onClick={reset}
                          className="px-4 py-2 bg-[var(--action-primary)] hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
                        >
                          Ready For Next Scan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Operational Exceptions & Error States */}
                  {state === "error" && error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-455 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-[var(--action-danger)]">Verification Denied</h3>
                        <p className="text-xs text-[var(--text-secondary)]">{error.message}</p>
                      </div>
                      <button
                        onClick={reset}
                        className="px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors active:scale-[0.98]"
                      >
                        Resume Verification
                      </button>
                    </motion.div>
                  )}

                  {/* Scan Confirmation Verification Interface */}
                  {state === "confirming" && currentStudent && (
                    <ScanConfirmation
                      student={currentStudent}
                      onConfirm={(dir, reason) => confirmScan(addToast, dir, reason)}
                      onCancel={cancelScan}
                      isInline={true}
                    />
                  )}

                  {/* Empty State */}
                  {state !== "confirming" && state !== "success" && state !== "error" && (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800/10 text-[var(--text-muted)] flex items-center justify-center mx-auto">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">No Active Verification</h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Scan a QR code or enter a student roll number manually to verify details.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick stats banner under Scan Desk view */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Entries
                </span>
                <span className="text-lg font-bold tabular-nums text-emerald-400 mt-0.5 block">
                  {todaysStats?.entries ?? 0}
                </span>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Exits
                </span>
                <span className="text-lg font-bold tabular-nums text-[var(--action-danger)] mt-0.5 block">
                  {todaysStats?.exits ?? 0}
                </span>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Campus
                </span>
                <span className="text-lg font-bold tabular-nums text-[var(--text-primary)] mt-0.5 block">
                  {todaysStats?.onCampus ?? 0}
                </span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] pb-safe">
      <main className="flex-1 max-w-lg w-full mx-auto p-2 sm:p-4 space-y-4">
        {/* Gate Operational Status Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[var(--text-primary)]">{gateName}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-400">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-amber-400">Offline Queue</span>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Inner view */}
        {renderActiveView()}
      </main>

      {/* Live Camera Scanner Dialog/Component */}
      <Scanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleQRScanned}
        onManualEntryClick={() => {
          setShowCameraScanner(false);
          setOperatorSubMode("manual");
        }}
      />
    </div>
  );
}
