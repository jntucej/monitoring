"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { normalizeScannedPayload } from "@/lib/barcode";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, KeyRound, UserCheck, Mic, ShieldAlert, Hourglass, ArrowUp, ArrowDown, ChevronUp, Clock } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { useKioskOperator } from "@/hooks/useKioskOperator";
import { useToast } from "@/components/ui/toast";
import { ScanConfirmation } from "@/components/operator/ScanConfirmation";
import { VoiceAssistantModal } from "@/components/operator/VoiceAssistantModal";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { ScanViewfinder } from "@/components/operator/ScanViewfinder";
import { RecentScans } from "@/components/operator/RecentScans";
import { ScanDetailModal } from "@/components/operator/ScanDetailModal";
import { BreakdownPanel } from "@/components/operator/BreakdownPanel";
import { operatorIcon } from "@/config/operator-icons";
import type { Scan as ScanRecord } from "@/lib/types";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useScanQueueSync } from "@/hooks/useScanQueueSync";

function OperatorPageInner() {
  const params = useParams<{ gateId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const lastRollRef = useRef<string>("");
  const { college } = useCollegeInfo();
  const gateIdParam = params?.gateId;
  const isSpecialPath = gateIdParam === "history" || gateIdParam === "manual";
  
  const { authenticated, user, logout } = useAuth();

  // Unassigned operators fall back to a default gate (resolved below from
  // /api/gates, preferring the Main Campus Gate) instead of a dead-end.
  const [defaultGateId, setDefaultGateId] = useState<string | null>(null);
  useEffect(() => {
    if (user?.gateId) return; // assigned operator — no default needed
    fetch("/api/gates")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success || !Array.isArray(data.data)) return;
        const active = data.data.filter((g: any) => g.is_active !== false);
        if (active.length === 0) return;
        const main =
          active.find((g: any) => /main/i.test(g.name || "")) || active[0];
        setDefaultGateId(main.id || main.gate_code || main.gateCode || null);
      })
      .catch(() => {});
  }, [user?.gateId]);

  const gateId = isSpecialPath
    ? (user?.gateId || defaultGateId || "")
    : (gateIdParam || user?.gateId || defaultGateId || "");
  const currentTab = isSpecialPath && gateIdParam === "history" ? "history" : (searchParams?.get("tab") || "scandesk");
  
  const { addToast } = useToast();
  const operatorStore = useOperatorStore();
  const {
    state,
    currentStudent,
    currentCampusStatus,
    lastScan,
    selectedDirection,
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

  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [activeLockdown, setActiveLockdown] = useState<any>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [stripExpanded, setStripExpanded] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const scanQueueSync = useScanQueueSync();

  // Local active tab for the desk panel: scan, manual, entry
  const [operatorSubMode, setOperatorSubMode] = useState<"scan" | "manual" | "entry">("scan");

  // Kiosk auto-sign-in: when this page opens with NO active session, try
  // to mint a default-operator session via /api/operator/kiosk-session.
  // The hook is a no-op if a real operator already has an active session,
  // so a normal PIN/password login always takes precedence.
  const { state: kiosk } = useKioskOperator(
    gateIdParam && !isSpecialPath ? gateIdParam : undefined
  );

  // Redirect unauthenticated users to operator login, but hold off while the
  // kiosk fetch is in flight: a default session may still arrive and flip
  // `authenticated` to true before the redirect would fire. Once the kiosk
  // attempt settles without a session (notConfigured / error), redirect.
  useEffect(() => {
    if (authenticated || kiosk.pending) return;
    router.replace(`/login/operator?redirect=/gate/${gateId}`);
  }, [authenticated, kiosk.pending, gateId, router]);

  // Check lockdown status
  const checkLockdown = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await fetch("/api/lockdown/active");
      const json = await res.json();
      if (json.success && json.data) {
        setActiveLockdown(json.data);
      } else {
        setActiveLockdown(null);
      }
    } catch {}
  }, [authenticated]);

  useEffect(() => {
    checkLockdown();
  }, [checkLockdown]);
  usePolling(checkLockdown, { intervalMs: 10000 });
  
  // Redirect special routing path shortcuts (/gate/history & /gate/manual) to operators dynamic gate path
  useEffect(() => {
    if (isSpecialPath) {
      const targetGate = user?.gateId || defaultGateId;
      if (targetGate) {
        if (gateIdParam === "history") {
          router.replace(`/gate/${targetGate}?tab=history`);
        } else {
          router.replace(`/gate/${targetGate}?tab=scandesk&mode=manual`);
        }
      } else {
        // No gate assigned and no default gate available — send to operator dashboard
        router.replace("/operator");
      }
    }
  }, [isSpecialPath, gateIdParam, user?.gateId, defaultGateId, router]);

  // Adjust operatorSubMode when URL parameters change (mode=manual → manual desk)
  useEffect(() => {
    const mode = searchParams?.get("mode");
    let targetMode: "scan" | "manual" | "entry" | null = null;
    if (mode === "manual" || (isSpecialPath && gateIdParam === "manual")) {
      targetMode = "manual";
    } else if (mode === "scan") {
      targetMode = "scan";
    }
    if (targetMode) setOperatorSubMode(targetMode);
  }, [searchParams, isSpecialPath, gateIdParam]);

  // Unassigned operators fall back to the default gate; if none is available,
  // they see the "no gate" waiting panel (needsAssignment stays true).
  const [needsAssignment, setNeedsAssignment] = useState(false);
  useEffect(() => {
    if (!authenticated || !user) return;
    if (gateId === "" || gateId === "history" || gateId === "manual") {
      if (user.gateId || defaultGateId) {
        setNeedsAssignment(false);
      } else {
        setNeedsAssignment(true);
      }
    } else {
      setNeedsAssignment(false);
    }
  }, [authenticated, user, gateId, defaultGateId]);

  // Dynamic periodic sync of stats: 5s on desktop, 15s on mobile (width < 768)
  usePolling(loadStats, { intervalMs: 5000 });
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [manualRollInput, setManualRollInput] = useState("");

  // Open the bottom sheet on mount when ?tab=history is present
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "history") {
      setBottomSheetOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ?tab=history opens the bottom sheet on mount
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "history") {
      setBottomSheetOpen(true);
      // Clean the URL param after opening the sheet
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Derive effective sub-mode: when a scan flow is active (any non-idle
  // state), force the "entry" tab so the user sees the confirmation/success/
  // error UI regardless of which tab was previously selected.
  const effectiveSubMode =
    state !== "idle" ? ("entry" as const) : operatorSubMode;

  // When a scan is active, redirect away from query param tabs to keep
  // the URL clean and consistent with the visible desk view.
  useEffect(() => {
    if (state !== "idle" && searchParams?.get("tab")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
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
    const rollCandidate = normalizeScannedPayload(scannedPayload);
    if (!rollCandidate) {
      addToast({ variant: "error", title: "Empty Scan", message: "No identifier found in the scanned code." });
      return;
    }
    lastRollRef.current = rollCandidate;
    startScan(rollCandidate);
  };

  const showWebAuthn = false;

  
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__handleQRScannedForTesting = handleQRScanned;
    }
  }, [handleQRScanned]);

  // ── Flag banner helper: renders an inline banner above ScanConfirmation ──
  const FLAG_META: Record<string, { color: string; cause: string; hint: string }> = {
    UNAUTHORIZED_EXIT: { color: "red", cause: "Exit attempt without valid pass or authorization.", hint: "Check pass status or escalate to principal." },
    NO_GATE_PASS: { color: "red", cause: "No approved gate pass on file for this movement.", hint: "Verify pass in the approval console before allowing exit." },
    SUSPENDED: { color: "red", cause: "Student account is suspended by administration.", hint: "No gate movement allowed until suspension is lifted." },
    MANUAL_LOCKDOWN: { color: "red", cause: "Account manually locked by security.", hint: "Unflag the account via the flag control below." },
    OVERDUE: { color: "amber", cause: "Approved pass window has lapsed.", hint: "Student is overdue; record exit or escalate." },
    CURFEW_VIOLATION: { color: "amber", cause: "Movement attempted outside curfew window.", hint: "Verify identity and note the curfew violation." },
  };

  const renderFlagBanner = () => {
    const flag = currentStudent?.flagStatus;
    if (!flag) return null;
    const meta = FLAG_META[flag];
    if (!meta) return null;
    const isRed = meta.color === "red";
    const FlagIcon = operatorIcon("flag").icon;
    const Icon = isRed ? ShieldAlert : Hourglass;
    return (
      <div
        role="alert"
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-sm ${
          isRed
            ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
            : "bg-amber-500/15 border-amber-500/40 text-amber-300"
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isRed ? "bg-rose-500/25 text-rose-400" : "bg-amber-500/25 text-amber-400"
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <FlagIcon className={`w-3.5 h-3.5 ${isRed ? "text-rose-400" : "text-amber-400"}`} />
            <span className="font-extrabold text-xs uppercase tracking-wider">{flag}</span>
          </div>
          <p className="text-[11px] opacity-90">{meta.cause}</p>
          <p className="text-[10px] font-semibold opacity-70">{meta.hint}</p>
        </div>
      </div>
    );
  };

  // ── 28px status strip ─────────────────────────────────────────────────────
  const statusStrip = operatorStore.getStatusStrip(scanQueueSync.queuedCount);
  const healthDotClass =
    statusStrip.health === "healthy"
      ? "bg-emerald-400"
      : statusStrip.health === "caution"
      ? "bg-amber-400"
      : "bg-rose-500";

  const renderStatusStrip = () => (
    <div
      role="button"
      aria-label="Expand gate status details"
      aria-expanded={stripExpanded}
      onClick={() => setStripExpanded(!stripExpanded)}
      className="w-full h-[28px] rounded-lg bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border)] flex items-center justify-between px-2.5 cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]"
    >
      {/* Left: health dot + gate + counts */}
      <div className="flex items-center gap-1.5 min-w-0 text-[10px] font-semibold">
        <span className={`w-2 h-2 rounded-full shrink-0 ${healthDotClass} ${statusStrip.health !== "healthy" ? "animate-pulse" : ""}`} />
        <span className="text-[var(--text-primary)] font-bold truncate">{statusStrip.gate}</span>
        <span className="text-[var(--text-muted)]">·</span>
        <span className="inline-flex items-center gap-0.5 text-emerald-400">
          <ArrowUp className="w-3 h-3" />{statusStrip.entries}
        </span>
        <span className="inline-flex items-center gap-0.5 text-rose-400">
          <ArrowDown className="w-3 h-3" />{statusStrip.exits}
        </span>
        <span className="text-[var(--text-muted)] hidden sm:inline">·</span>
        <span className="text-[var(--text-muted)] hidden sm:inline">{statusStrip.shift}</span>
        <span className="text-[var(--text-muted)]">·</span>
        <span className="inline-flex items-center gap-0.5 text-[var(--text-muted)]">
          <Clock className="w-3 h-3" />{statusStrip.lastScanAgo}
        </span>
        {statusStrip.queuedCount > 0 && (
          <>
            <span className="text-[var(--text-muted)]">·</span>
            <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
              <Hourglass className="w-3 h-3" />{statusStrip.queuedCount}
            </span>
          </>
        )}
      </div>

      {/* Right: Voice button + Online/Offline badge (smaller) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowVoiceModal(!showVoiceModal); }}
          className="p-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 flex items-center"
          title="Voice Assistant"
        >
          <Mic className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-[9px] text-[var(--text-secondary)]">
          {(operatorStore.gate?.isOnline ?? true) ? (
            <span className="font-bold text-emerald-400">Online</span>
          ) : (
            <span className="font-bold text-rose-400">Offline</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch (currentTab) {
      case "stats":
        // Stats now live in the status-strip expansion (stripExpanded).
        // This case is kept for backward-compat but renders nothing.
        return null;

      case "history":
        // History is now rendered as a bottom sheet; the tab is kept for URL
        // compatibility but the sheet is opened via bottomSheetOpen state.
        return null;

      case "profile":
        // Profile is now in the More menu (operator/layout.tsx).
        return null;

      case "scandesk":
      default:
        if (needsAssignment) {
          return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-[var(--bg-surface)] border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">No active gate available</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                  You have no gate assigned and no active gate was found. Ask a system administrator
                  to enable a gate or assign you to one (SysAdmin → Gates). The kiosk will resolve a
                  default gate automatically once one is active.
                </p>
                <button
                  onClick={() => router.push("/operator")}
                  className="px-4 py-2 rounded-xl bg-[var(--action-primary)] text-slate-950 text-xs font-bold hover:brightness-110 transition"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                      onScanQr={() => {
                        setShowCameraScanner(true);
                      }}
                      onScanBarcode={() => {
                        setShowCameraScanner(true);
                      }}
                      onManualEntry={() => setOperatorSubMode("manual")}
                      scanning={state === "detecting"}
                      lastScanRoll={lastScan?.roll}
                    />
                  )}

                  {effectiveSubMode === "manual" && (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Manual Student Lookup</h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          Type &gt; then roll number (or paste a roll number directly) to start a manual scan.
                        </p>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (activeLockdown) {
                            addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
                            return;
                          }
                          const raw = manualRollInput.trim().toUpperCase();
                          // Strip the leading ">" prefix if present
                          const roll = raw.startsWith(">") ? raw.slice(1).trim() : raw;
                          if (roll) {
                            lastRollRef.current = roll;
                            startScan(roll);
                          }
                        }}
                        className="space-y-3"
                      >
                        <input
                          type="text"
                          maxLength={11}
                          value={manualRollInput}
                          onChange={(e) => setManualRollInput(e.target.value.toUpperCase())}
                          placeholder="e.g. &gt;24JJ1A0501"
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
                      <SuccessFlash onClick={reset} direction={lastScan?.direction} reason={lastScan?.reason as string} />
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
                  {state === "error" && error && (() => {
                    const isAuthError =
                      error.code === "UNAUTHORIZED" ||
                      error.code === "SESSION_EXPIRED" ||
                      (typeof error.message === "string" &&
                        /token|session|unauthorized|sign in|authentication/i.test(error.message));
                    const canRetry = error.retryable === true;
                    const isNetworkError =
                      error.code === "NETWORK_ERROR" || error.code === "TIMEOUT" || error.code === "OFFLINE_BLOCKED";
                    const isQueued = error.queued === true;
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`scan-error p-5 rounded-2xl text-center space-y-3 ${
                          isQueued ? "bg-amber-500/10 border border-amber-500/30" : "bg-rose-500/10 border border-rose-500/30"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${
                          isQueued ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-500"
                        }`}>
                          {isQueued ? <Hourglass className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1">
                          <h3 className={`font-bold text-sm ${isQueued ? "text-amber-400" : "text-[var(--action-danger)]"}`}>
                            {isQueued
                              ? "Scan Queued"
                              : isAuthError
                              ? "Verification Failed"
                              : error.code === "NOT_FOUND"
                              ? "Person Not Found"
                              : error.code === "ACCOUNT_INACTIVE"
                              ? "Verification Failed (Account Inactive)"
                              : error.code === "DUPLICATE"
                              ? "Duplicate Scan"
                              : isNetworkError
                              ? "Network Error"
                              : "Verification Failed"}
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)]">{error.message}</p>
                          {isAuthError && (
                            <p className="text-[10px] font-semibold text-amber-400">
                              Your session could not be verified. Dismiss to sign in again.
                            </p>
                          )}
                        </div>
                        <div className="flex justify-center gap-2">
                          {canRetry && !isQueued && (
                            <button
                              type="button"
                              id="retry-btn"
                              onClick={() => {
                                if (currentStudent) { confirmScan(addToast, undefined, undefined, operatorStore.entryType ?? undefined); } else if (lastRollRef.current) { startScan(lastRollRef.current); } else { reset(); }
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors active:scale-[0.98] flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Retry
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (isAuthError) {
                                logout();
                              } else {
                                reset();
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors active:scale-[0.98]"
                          >
                            {isAuthError ? "Dismiss & Sign In Again" : "Dismiss"}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* Inline flag banner (pinned above ScanConfirmation) */}
                  {state === "confirming" && currentStudent?.flagStatus && (
                    <div className="relative z-40">
                      {renderFlagBanner()}
                    </div>
                  )}

                  {/* Scan Confirmation Verification Interface */}
                  {state === "confirming" && currentStudent && (
                    <ScanConfirmation
                      student={currentStudent}
                      campusStatus={currentCampusStatus}
                      currentEntryType={operatorStore.entryType}
                      lastOutReason={operatorStore.lastOutReason}
                      onConfirm={async (dir, reason, entryType, buttonId) =>
                        await confirmScan(addToast, dir, reason, entryType, buttonId)
                      }
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
                        Scan a QR code, or type &gt; + roll number to verify manually.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] pb-safe min-w-0">
      <main className="flex-1 w-full max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto p-2 sm:p-4 space-y-3">
        {/* 28px status strip (replaces the old Gate Operational Status Bar) */}
        {renderStatusStrip()}

        {/* Expandable breakdown (inline, no modal) */}
        {stripExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Breakdown</h3>
              <button
                type="button"
                onClick={() => setStripExpanded(false)}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold"
              >
                Close
              </button>
            </div>
            <BreakdownPanel breakdown={breakdown} />
          </motion.div>
        )}

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

        {/* Voice Assistant Modal */}
        {showVoiceModal && (
          <VoiceAssistantModal
            onExecuteCommand={(cmd) => {
              if (activeLockdown) {
                addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
                return;
              }
              if ((cmd.action === "SCAN" || cmd.action === "ENTRY" || cmd.action === "MANUAL_ENTRY") && cmd.roll_number) {
                lastRollRef.current = cmd.roll_number;
                startScan(cmd.roll_number);
                setOperatorSubMode("manual");
                setManualRollInput(cmd.roll_number);
              } else if (cmd.action === "EXIT") {
                if (currentStudent) confirmScan(addToast, "OUT", undefined, operatorStore.entryType ?? undefined);
              } else if (cmd.action === "UNKNOWN") {
                cancelScan();
              }
            }}
          />
        )}

        {/* Dynamic Inner view */}
        <div className="min-w-0 w-full">{renderActiveView()}</div>

        {/* Bottom sheet trigger: small ↑ button */}
        <button
          type="button"
          onClick={() => setBottomSheetOpen(true)}
          className="fixed bottom-4 right-4 z-40 w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Open recent scans"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* Bottom sheet: swipe-up panel for RecentScans + ScanDetailModal */}
        <AnimatePresence>
          {bottomSheetOpen && (
            <motion.div
              key="bottom-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)] border-t border-[var(--border)] rounded-t-2xl shadow-2xl max-h-[70dvh] overflow-y-auto pb-safe"
            >
              {/* Drag handle */}
              <div className="sticky top-0 z-10 flex items-center justify-center pt-2 pb-1 bg-[var(--bg-surface)]">
                <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
              </div>

              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--action-primary)]" />
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Recent Scans</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBottomSheetOpen(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold"
                  >
                    Close
                  </button>
                </div>
                <RecentScans scans={recentScans} onSelect={setSelectedScan} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dev contact strip for reporting gate issues */}
        <div className="pt-2">
          <DevContactStrip />
        </div>
      </main>

      {/* Person overview modal opened by tapping a log */}
      <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />

      {/* Live Camera Scanner Dialog/Component — auto-detects format */}
      <Scanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleQRScanned}
        onManualEntryClick={() => {
          setShowCameraScanner(false);
          setOperatorSubMode("manual");
        }}
        gateId={gateId || user?.gateId}
      />
    </div>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-muted)]">Loading…</div>}>
      <OperatorPageInner />
    </Suspense>
  );
}
