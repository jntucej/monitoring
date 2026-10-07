"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle, Scan, KeyRound, UserCheck, LayoutDashboard, Clock, User as UserIcon, Mic, ShieldAlert } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { ScanConfirmation } from "@/components/operator/ScanConfirmation";
import { VoiceAssistantModal } from "@/components/operator/VoiceAssistantModal";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { ScanViewfinder } from "@/components/operator/ScanViewfinder";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { RecentScans } from "@/components/operator/RecentScans";
import { OperatorStats } from "@/components/operator/OperatorStats";
import { BreakdownPanel } from "@/components/operator/BreakdownPanel";
import { OutingPanel } from "@/components/operator/OutingPanel";
import { ScanDetailModal } from "@/components/operator/ScanDetailModal";
import type { Scan as ScanRecord } from "@/lib/types";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { useUIStore } from "@/stores/uiStore";

export default function OperatorPage() {
  const params = useParams<{ gateId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const { college } = useCollegeInfo();
  const gateIdParam = params?.gateId;
  const isSpecialPath = gateIdParam === "history" || gateIdParam === "manual";
  
  const { authenticated, user, logout } = useAuth();
  
  const gateId = isSpecialPath ? (user?.gateId || "1") : (gateIdParam || "1");
  const currentTab = isSpecialPath && gateIdParam === "history" ? "history" : (searchParams?.get("tab") || "scandesk");
  
  const { addToast } = useToast();
  const operatorStore = useOperatorStore();
  const {
    state,
    currentStudent,
    lastScan,
    todaysStats,
    recentScans,
    breakdown,
    outing,
    error,
    startScan,
    cancelScan,
    reset,
    setGate,
    loadStats,
  } = operatorStore;
  const confirmScan = operatorStore.confirmScan;

  // Log detail modal selection
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [activeLockdown, setActiveLockdown] = useState<any>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Local active tab for the desk panel: scan, manual, entry
  const [operatorSubMode, setOperatorSubMode] = useState<"scan" | "manual" | "entry">("scan");

  // Poll for Active Lockdown
  // Redirect unauthenticated users to operator login
  useEffect(() => {
    if (!authenticated) {
      router.replace(`/login/operator?redirect=/gate/${gateId}`);
      return;
    }
  }, [authenticated, gateId, router]);

  useEffect(() => {
    const checkLockdown = async () => {
      try {
        const res = await fetch("/api/admin/lockdown");
        const json = await res.json();
        if (json.success && json.data) {
          setActiveLockdown(json.data);
        } else {
          setActiveLockdown(null);
        }
      } catch {}
    };
    checkLockdown();
    const interval = setInterval(checkLockdown, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Redirect special routing path shortcuts (/gate/history & /gate/manual) to operators dynamic gate path
  useEffect(() => {
    if (isSpecialPath && user?.gateId) {
      if (gateIdParam === "history") {
        router.replace(`/gate/${user.gateId}?tab=history`);
      } else {
        router.replace(`/gate/${user.gateId}?tab=scandesk&mode=manual`);
      }
    }
  }, [isSpecialPath, gateIdParam, user?.gateId, router]);

  // Adjust operatorSubMode when URL parameters change
  useEffect(() => {
    const mode = searchParams?.get("mode");
    let targetMode: "scan" | "manual" | "entry" | null = null;
    if (mode === "manual" || (isSpecialPath && gateIdParam === "manual")) {
      targetMode = "manual";
    } else if (mode === "scan") {
      targetMode = "scan";
    }
    if (targetMode && operatorSubMode !== targetMode) {
      setOperatorSubMode(targetMode);
    }
  }, [searchParams, isSpecialPath, gateIdParam, operatorSubMode]);

  // Ref to store polling interval ID
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic periodic sync of stats: 5s on desktop, 15s on mobile (width < 768)
  useEffect(() => {
    if (!authenticated) return;

    const setupInterval = () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      if (typeof document !== "undefined" && document.hidden) return;

      loadStats();

      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      const pollInterval = isMobile ? 15000 : 5000;

      statsIntervalRef.current = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        loadStats();
      }, pollInterval);
    };

    setupInterval();

    const handleVisibilityChange = () => {
      setupInterval();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authenticated, loadStats]);
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
  // Auto-reset & Tap Anywhere to ready next scan when state === "success"
  useEffect(() => {
    if (state !== "success") return;

    // Auto-reset after 2.5 seconds if no manual tap occurs
    const autoResetTimer = setTimeout(() => {
      reset();
    }, 2500);

    const handleTapAnywhere = () => {
      reset();
    };

    // Delay adding the event listener slightly so the click that confirmed the scan doesn't instantly dismiss success
    const listenerTimer = setTimeout(() => {
      window.addEventListener("click", handleTapAnywhere, { once: true });
      window.addEventListener("touchstart", handleTapAnywhere, { once: true });
    }, 200);

    return () => {
      clearTimeout(autoResetTimer);
      clearTimeout(listenerTimer);
      window.removeEventListener("click", handleTapAnywhere);
      window.removeEventListener("touchstart", handleTapAnywhere);
    };
  }, [state, reset]);

  // Ref to prevent double initialization
  const gateInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!authenticated) return;
    if (gateInitializedRef.current === gateId) return;
    gateInitializedRef.current = gateId;

    const init = async () => {
      await setGate(gateId);
      if (mounted) reset();
    };
    init();

    return () => {
      mounted = false;
    };
  }, [authenticated, gateId, setGate, reset]);

  const [gateName, setGateName] = useState("Loading...");

  useEffect(() => {
    fetch("/api/gates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const match = data.data.find(
            (g: any) => g.id === gateId || g.gate_code === gateId || g.gateCode === gateId || g.id === `gate-${gateId}`
          );
          setGateName(match?.name || operatorStore.gate?.name || `Gate ${gateId}`);
        }
      })
      .catch(() => setGateName(operatorStore.gate?.name || `Gate ${gateId}`));
  }, [gateId, operatorStore.gate?.name]);

  const handleQRScanned = (scannedPayload: string) => {
    if (activeLockdown) {
      addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
      return;
    }
    let rollCandidate = scannedPayload.trim();
    if (rollCandidate.startsWith("{")) {
      try {
        const parsed = JSON.parse(rollCandidate);
        if (parsed.roll) rollCandidate = parsed.roll;
        else if (parsed.student_roll) rollCandidate = parsed.student_roll;
        else if (parsed.uniqueId) rollCandidate = parsed.uniqueId;
      } catch {
        // use raw
      }
    }
    startScan(rollCandidate);
  };

  const showWebAuthn = false;

  
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__handleQRScannedForTesting = handleQRScanned;
    }
  }, [handleQRScanned]);

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
            <BreakdownPanel breakdown={breakdown} />
            <OutingPanel entries={outing} />
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] space-y-3">
              <h3 className="font-bold text-sm">Desk Statistics Information</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Aggregated values are refreshed live from the backend API of {college?.shortName || "Loading..."}. Strict online policy is active; all scan events process instantly against the backend server.
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
                        <RecentScans scans={recentScans} onSelect={setSelectedScan} />
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
                className={`flex-grow py-2.5 px-2 min-h-[44px] rounded-xl font-bold text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                  operatorSubMode === "scan"
                    ? "bg-[var(--action-primary)] text-slate-950 shadow-md font-extrabold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Scan className="w-4 h-4 shrink-0" />
                <span className="truncate">Scan QR</span>
              </button>
              <button
                onClick={() => setOperatorSubMode("manual")}
                className={`flex-grow py-2.5 px-2 min-h-[44px] rounded-xl font-bold text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                  operatorSubMode === "manual"
                    ? "bg-amber-400 text-slate-950 shadow-md font-extrabold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span className="truncate">Manual Enter</span>
              </button>
              <button
                onClick={() => setOperatorSubMode("entry")}
                className={`flex-grow relative py-2.5 px-2 min-h-[44px] rounded-xl font-bold text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                  operatorSubMode === "entry"
                    ? "bg-[var(--action-primary)] text-slate-950 shadow-md font-extrabold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Entry Details</span>
                {(state === "confirming" || state === "error") && (
                  <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border-2 border-[var(--bg-surface)]" />
                )}
              </button>
            </div>

            {/* Switchable Workspace */}
            <div className="min-h-[220px]">
              {activeLockdown ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3 shadow-md">
                  <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-rose-400 uppercase tracking-wide">
                      Scans Restricted — Campus Lockdown Active
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {activeLockdown.message || "Emergency lockdown is in effect. All gate scan transactions are blocked by system security."}
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                          if (activeLockdown) {
                            addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
                            return;
                          }
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
                          disabled={!!activeLockdown}
                          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-base font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none disabled:opacity-50"
                        />

                        <button
                          type="submit"
                          disabled={!manualRollInput.trim() || state === "detecting" || !!activeLockdown}
                          className="w-full py-3.5 px-4 rounded-xl bg-[var(--action-primary)] border border-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                        >
                          <KeyRound className="w-5 h-5" />
                          <span>Verify Roll Number</span>
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}

              {effectiveSubMode === "entry" && (
                <div className="space-y-4">
                  {/* Success Visual Flash & Tap Anywhere to Reset */}
                  {state === "success" && (
                    <div className="scan-success space-y-4 cursor-pointer select-none" onClick={reset}>
                      <SuccessFlash onClick={reset} />
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2 hover:bg-emerald-500/20 transition-colors">
                        <p className="text-xs text-emerald-400 font-bold">Movement Recorded Successfully</p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Tap anywhere or wait 2s to scan next student
                        </p>
                        <button
                          onClick={reset}
                          className="px-4 py-2 bg-[var(--action-primary)] hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
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
                      className="scan-error p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-[var(--action-danger)]">
                          {error.code === "NOT_FOUND"
                            ? "Person Not Found"
                            : error.code === "ACCOUNT_INACTIVE"
                            ? "Verification Denied (Account Inactive)"
                            : error.code === "DUPLICATE"
                            ? "Duplicate Scan Warning"
                            : error.code === "NETWORK_ERROR" || error.code === "TIMEOUT"
                            ? "Network Error"
                            : "Verification Denied"}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">{error.message}</p>
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          id="retry-btn"
                          onClick={() => {
                            if (currentStudent) {
                              confirmScan(addToast);
                            } else {
                              reset();
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors active:scale-[0.98] flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                        <button
                          onClick={() => {
                            if (error.code === "UNAUTHORIZED" || error.code === "SESSION_EXPIRED" || error.message?.toLowerCase().includes("token")) {
                              logout();
                            } else {
                              reset();
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors active:scale-[0.98]"
                        >
                          {error.code === "UNAUTHORIZED" || error.code === "SESSION_EXPIRED" || error.message?.toLowerCase().includes("token")
                            ? "Log In Again"
                            : "Dismiss"}
                        </button>
                      </div>
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
      <main className="flex-1 w-full max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto p-2 sm:p-4 space-y-4">
        {/* Emergency Lockdown Active Alert Header Banner */}
        {activeLockdown && (
          <div className="bg-rose-600 text-white p-4 rounded-xl border border-rose-700 shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 shrink-0 text-amber-200" />
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider">🚨 CAMPUS LOCKDOWN IN EFFECT</h4>
                <p className="text-xs opacity-90">{activeLockdown.message || "All gate scans are currently restricted by security administration."}</p>
              </div>
            </div>
          </div>
        )}

        {/* Gate Operational Status Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[var(--text-primary)]">{gateName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVoiceModal(!showVoiceModal)}
              className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1 text-xs font-semibold"
              title="Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice</span>
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
              <span className="font-bold text-emerald-400">Online</span>
            </div>
          </div>
        </div>

        {/* Voice Assistant Modal */}
        {showVoiceModal && (
          <VoiceAssistantModal
            onExecuteCommand={(cmd) => {
              if (activeLockdown) {
                addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
                return;
              }
              if ((cmd.action === "SCAN" || cmd.action === "ENTRY" || cmd.action === "MANUAL_ENTRY") && cmd.roll_number) {
                startScan(cmd.roll_number);
                setOperatorSubMode("manual");
                setManualRollInput(cmd.roll_number);
              } else if (cmd.action === "EXIT") {
                if (currentStudent) confirmScan(addToast, "OUT");
              } else if (cmd.action === "UNKNOWN") {
                cancelScan();
              }
            }}
          />
        )}

        {/* Dynamic Inner view */}
        {renderActiveView()}
      </main>

      {/* Person overview modal opened by tapping a log */}
      <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />

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

      {/* WebAuthn / Passkey Biometric confirmation step after the ID scan */}
      
    </div>
  );
}
