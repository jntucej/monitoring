"use client";


import { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { normalizeScannedPayload } from "@/lib/barcode";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, KeyRound, UserCheck, Mic, ShieldAlert, Hourglass, ArrowUp, ArrowDown, Clock, Wrench, Moon, WifiOff } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import { useAuth } from "@/hooks/useAuth";
import { useKioskOperator } from "@/hooks/useKioskOperator";
import { useToast } from "@/components/ui/toast";
import { ScanConfirmation } from "@/components/operator/ScanConfirmation";
import { VoiceAssistantModal } from "@/components/operator/VoiceAssistantModal";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { ScanViewfinder } from "@/components/operator/ScanViewfinder";
import { ScanDetailModal } from "@/components/operator/ScanDetailModal";
import { operatorIcon } from "@/config/operator-icons";
import { MobileOperatorScanView } from "@/components/mobile/MobileOperatorScanView";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { Scan as ScanRecord } from "@/lib/types";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { primeAudio } from "@/lib/sound";
import { OperatorGateClaimPanel } from "@/components/operator/OperatorGateClaimPanel";
import { flushOfflineScanQueue, getOfflineScanQueue } from "@/lib/kiosk-offline-queue";
import { useAuthStore } from "@/stores/authStore";

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
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineCount, setOfflineCount] = useState<number>(0);

  // Mobile (< md) renders the dedicated mobile scan view (camera + decode +
  // confirmation bottom sheet). Desktop keeps the existing desk layout. Both
  // paths drive the same useOperatorStore, so recent scans/stats stay in
  // sync regardless of which view ran the scan.
  const { md: isDesktop } = useBreakpoint({ md: "(min-width: 768px)" });

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
  usePolling(checkLockdown, { intervalMs: 10000 /* R15: name this profile */ /* R15: name this profile */ });
  
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

  // Unassigned operators see the "Register / claim a gate" panel so they can
  // enter the claim code a supervisor generated for them. If a default gate is
  // available (kiosk), show the claim panel first, then fall back to the
  // default gate on the operator console.
  const [needsAssignment, setNeedsAssignment] = useState(false);
  useEffect(() => {
    if (!authenticated || !user) return;
    if (gateId === "" || gateId === "history" || gateId === "manual") {
      // No gate of their own: show the register/claim panel.
      setNeedsAssignment(true);
    } else {
      setNeedsAssignment(false);
    }
  }, [authenticated, user, gateId]);

  // Fix #1: the Scanner's decode loop should only run while idle or actively
  // detecting. Once confirming / success / error, stop decoding so jsQR CPU
  // isn't wasted on a frozen frame.
  const scannerActive = state === "idle" || state === "detecting";
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [manualRollInput, setManualRollInput] = useState("");

  // Fix #3: suppress stats polling while the camera scanner is open or a scan
  // is in-flight. Only poll when idle AND the scanner modal is closed.
  const pollEnabled = state === "idle" && !showCameraScanner;
  usePolling(loadStats, { intervalMs: 15_000, enabled: pollEnabled });

  // ?tab=history was the old bottom-sheet trigger; the sheet is gone (Log tab
  // in the operator bottom bar replaces it). Redirect legacy ?tab=history URLs
  // to the transactions log so deep links don't dead-end.
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "history") {
      router.replace("/operator/transactions");
    }
  }, [searchParams, router]);

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
  const [gateMode, setGateMode] = useState<string>("OPEN");

  useEffect(() => {
    // Poll gate operating mode (OPEN / CURFEW / MAINTENANCE)
    const checkMode = () => {
      fetch("/api/operator/mode")
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data?.mode) {
            setGateMode(res.data.mode);
          }
        })
        .catch(() => {});
    };
    checkMode();
    const interval = setInterval(checkMode, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-flush offline scan queue when network recovers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateOfflineCount = () => {
      setOfflineCount(getOfflineScanQueue().length);
    };

    const handleOnline = async () => {
      setIsOnline(true);
      updateOfflineCount();
      const auth = useAuthStore.getState();
      const token = auth.token;
      const headersGetter = () => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (token) h["Authorization"] = `Bearer ${token}`;
        return h;
      };
      const res = await flushOfflineScanQueue(headersGetter);
      updateOfflineCount();
      if (res.flushed > 0) {
        addToast({
          variant: "success",
          title: "Offline Scans Synced",
          message: `Successfully synchronized ${res.flushed} offline scan(s).`,
        });
        loadStats();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateOfflineCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    updateOfflineCount();

    const interval = setInterval(() => {
      updateOfflineCount();
      if (navigator.onLine) {
        handleOnline();
      }
    }, 15_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [addToast, loadStats]);

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

  // Fix #5: prime the AudioContext on the Scan QR / Scan Barcode button tap
  // so the success beep is audible on the very first scan (browsers keep
  // AudioContext suspended until a user gesture fires).
  const handleScanQrClick = () => {
    primeAudio();
    setShowCameraScanner(true);
  };
  const handleScanBarcodeClick = () => {
    primeAudio();
    setShowCameraScanner(true);
  };

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

  const renderActiveView = () => {
    switch (currentTab) {
      case "stats":
        // Stats are now shown in the operator bottom bar + stats panel on
        // desktop; nothing to render here for legacy ?tab=stats.
        return null;

      case "history":
        // History (recent scans) is now accessed via the Log tab in the
        // operator bottom bar (/operator/transactions). Nothing to render here.
        return null;

      case "profile":
        // Profile is now in the More menu (operator/layout.tsx).
        return null;

      case "scandesk":
      default:
        if (needsAssignment) {
          // No gate assigned to this operator — walk them through claiming one
          // via a supervisor-issued gate-claim code ("register at this kiosk").
          return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <OperatorGateClaimPanel />
            </div>
          );
        }
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Switchable Workspace */}
            <div className="min-h-[220px]">
              {!isOnline && (
                <div className="mb-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-300 text-xs shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <WifiOff className="w-5 h-5 shrink-0 text-amber-400" />
                    <div>
                      <p className="font-bold text-amber-200">Terminal Running Offline</p>
                      <p className="text-[11px] text-amber-300/80">Campus network connection dropped. Scans are preserved locally ({offlineCount} queued) and will sync upon reconnection.</p>
                    </div>
                  </div>
                </div>
              )}

              {isOnline && offlineCount > 0 && (
                <div className="mb-4 bg-sky-500/15 border border-sky-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-sky-300 text-xs shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-5 h-5 shrink-0 text-sky-400 animate-spin" />
                    <div>
                      <p className="font-bold text-sky-200">Synchronizing Offline Scans</p>
                      <p className="text-[11px] text-sky-300/80">Syncing {offlineCount} scan(s) to the campus security database…</p>
                    </div>
                  </div>
                </div>
              )}

              {gateMode === "MAINTENANCE" && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center space-y-2 shadow-sm animate-in fade-in">
                  <Wrench className="w-8 h-8 text-amber-500 mx-auto animate-bounce" />
                  <div>
                    <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wide">
                      Maintenance Mode Active
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Scheduled maintenance in progress. Routine scans are temporarily blocked.
                    </p>
                  </div>
                </div>
              )}

              {gateMode === "CURFEW" && (
                <div className="mb-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-5 text-center space-y-2 shadow-sm animate-in fade-in">
                  <Moon className="w-8 h-8 text-indigo-400 mx-auto" />
                  <div>
                    <h3 className="font-extrabold text-sm text-indigo-300 uppercase tracking-wide">
                      Night Curfew Hours Active
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Curfew restrictions in effect. An override reason is required for student exits.
                    </p>
                  </div>
                </div>
              )}

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
                      onScanQr={handleScanQrClick}
                      onScanBarcode={handleScanBarcodeClick}
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
                      error.code === "NETWORK_ERROR" || error.code === "TIMEOUT" || error.code === "OFFLINE_BLOCKED" ||
                      error.code === "NETWORK";
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="scan-error p-5 rounded-2xl text-center space-y-3 bg-rose-500/10 border border-rose-500/30"
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto bg-rose-500/20 text-rose-400">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-[var(--action-danger)]">
                            {isAuthError
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
                          {canRetry && (
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

                  {/* Empty State — confirmation now lives in the
                      AnimatePresence below the status strip */}
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

  // ── Mobile (< md) — dedicated mobile scan view. Same operatorStore, so
  // stats/recent-scans stay in sync with the desktop path.
  if (!isDesktop && !needsAssignment) {
    return (
      <div className="min-w-0 flex-1 overflow-y-auto bg-[var(--bg-base)]">
        <MobileOperatorScanView />
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] pb-safe min-w-0">
      <main className="flex-1 w-full max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto p-2 sm:p-4 space-y-3">
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
      </main>

      {/* Person overview modal opened by tapping a log */}
      <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />

      {/* Fix #4: single AnimatePresence mode="wait" so the scanner fully
          unmounts (releasing MediaStream + RAF) before the confirmation
          slides in. No overlap, no double-camera contention. */}
      <AnimatePresence mode="wait">
        {showCameraScanner && scannerActive ? (
          <motion.div
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Scanner
              isOpen={showCameraScanner}
              active={scannerActive}
              onClose={() => setShowCameraScanner(false)}
              onScan={handleQRScanned}
              onManualEntryClick={() => {
                setShowCameraScanner(false);
                setOperatorSubMode("manual");
              }}
              gateId={gateId || user?.gateId}
            />
          </motion.div>
        ) : state === "confirming" && currentStudent ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
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
          </motion.div>
        ) : null}
      </AnimatePresence>
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
