"use client";


import { useEffect, useState, useRef, useMemo, Suspense, useCallback } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useOperatorGate } from "@/hooks/useOperatorGate";
import { normalizeScannedPayload } from "@/lib/barcode";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, KeyRound, ShieldAlert, Hourglass, Wrench, Moon, WifiOff } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import type { ExitReason } from "@/lib/types";
import type { EntryButtonId, Recommendation } from "@/lib/operator-recommend";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { ScanConfirmation } from "@/components/operator/ScanConfirmation";
import { VoiceAssistantModal } from "@/components/operator/VoiceAssistantModal";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { ScanDetailModal } from "@/components/operator/ScanDetailModal";
import { operatorIcon } from "@/config/operator-icons";
import { MobileOperatorScanView } from "@/components/mobile/MobileOperatorScanView";
import { OfflineBanner } from "@/components/operator/OfflineBanner";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { Scan as ScanRecord, Student } from "@/lib/types";
import { useCollegeInfo } from "@/hooks/useCollegeInfo";
import { primeAudio } from "@/lib/sound";
import { useAuthStore } from "@/stores/authStore";

function OperatorPageInner() {
  const params = useParams<{ gateId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { role, gateId: assignedGateId } = useOperatorGate();

  // Deep-link guard: an operator landing on /gate/<other> is bounced to
  // their own assigned gate. The shell already blocks unassigned operators
  // (they see the picker), so this fires only when params.gateId !== assignedGateId.
  useEffect(() => {
    if (role !== "operator") return;
    if (!assignedGateId) return;
    if (params?.gateId !== assignedGateId) {
      router.replace(`/gate/${assignedGateId}`);
    }
  }, [role, assignedGateId, params?.gateId, router]);

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

  // Online status listener (offline scan queue has been removed; keep online
  // state tracking only for UI display purposes)
  useEffect(() => {
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => setIsOnline(true);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Mobile (< md) renders the dedicated mobile scan view (camera + decode +
  // confirmation bottom sheet). Desktop keeps the existing desk layout. Both
  // paths drive the same useOperatorStore, so recent scans/stats stay in
  // sync regardless of which view ran the scan.
  const { md: isDesktop } = useBreakpoint({ md: "(min-width: 768px)" });

  // Local active tab for the desk panel: scan, manual, entry
  const [operatorSubMode, setOperatorSubMode] = useState<"scan" | "manual" | "entry">("scan");

  // Redirect unauthenticated users to operator login.
  useEffect(() => {
    if (authenticated) return;
    router.replace(`/login/operator?redirect=/gate/${gateId}`);
  }, [authenticated, gateId, router]);

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
  const [manualRollInput, setManualRollInput] = useState("");

  // Scan mode chosen by the operator via the bottom mode bar (or Q / B hotkeys):
  // "qr" (jsQR / native QR detector) or "barcode" (native 1D/2D detector).
  // Passed to the always-mounted Scanner so the decode loop stays warm and just
  // swaps its detector in place — no camera re-open.
  const [scanMode, setScanMode] = useState<"qr" | "barcode">("qr");

  // Prefetched approved passes (see operatorStore._cachedPasses). Read via a
  // selector so the auto-confirm effect + autoConfirmDelay memo recompute when
  // the prefetched array is replaced during startScan. Passed into
  // getRecommendation as the approved-pass count.
  const cachedPasses = useOperatorStore((s) => s._cachedPasses);
  const cachedPassesLength = cachedPasses?.length ?? 0;

  // Fix #3: suppress stats polling while a scan is in-flight. Only poll when
  // idle. (The camera scanner is always mounted in the desktop path now, so
  // the old "scanner modal open" guard no longer applies.)
  const pollEnabled = state === "idle";
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
  //
  // The 3-button viewfinder is gone — the camera is the primary surface and is
  // always mounted. So `operatorSubMode` only has two real values now:
  //   "manual" — the operator is typing a roll number by hand, and
  //   "scan"   — camera is the primary surface (implicit; Scanner + overlays).
  // The implicit "entry" phase (confirm/success/error) is always taken over
  // when state !== "idle", and it renders as overlays that slide over the
  // live camera feed (see the desktop render path below).
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
  // Auto-reset to ready the next scan when state === "success". The camera
  // stays mounted (warm) the whole time; after the success flash we simply
  // clear the store and return to idle so the operator can scan again with
  // zero clicks. No tap-anywhere listener — the timer alone drives reset.
  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => {
      reset();
    }, 1500);
    return () => clearTimeout(t);
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

  // useCallback: the reference must be stable across renders. The
  // `useEffect([handleQRScanned])` below (line 478) and the `onScan` prop
  // both depend on this identity — a plain function re-created every render
  // causes the effect to re-run → setDefaultGateId / reset() → re-render →
  // new function identity → effect re-runs → infinite loop (React #310).
  const handleQRScanned = useCallback((scannedPayload: string) => {
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
  }, [activeLockdown, addToast, startScan]);

  // ── Auto-confirm by recommendation confidence ─────────────────────────────
  // 0-click engine: when the scanned student's recommendation is confident
  // enough we confirm automatically after a short countdown; otherwise the
  // operator must click. The delay is derived from the live recommendation's
  // confidence so the same value drives both the auto-confirm timer below AND
  // the `autoConfirmMs` bar shown in ScanConfirmation — the two always agree.
  const autoConfirmDelay = useMemo(() => {
    if (state !== "confirming" || !currentStudent) return null;
    const s = useOperatorStore.getState();
    const rec: Recommendation | null = s.getRecommendation(
      currentStudent as Student,
      cachedPassesLength,
    );
    if (!rec) return null;
    if (rec.confidence >= 0.9) return 400;
    if (rec.confidence >= 0.7) return 1200;
    return null; // low confidence → require an explicit operator click
  }, [state, currentStudent, cachedPassesLength]);

  // Fires the auto-confirm countdown. Skipped entirely for flagged / no-gate
  // pass students so the operator is forced to make a deliberate choice.
  useEffect(() => {
    if (state !== "confirming" || !currentStudent) return;
    // No-gate-pass / flagged: never auto-fire; force the operator to click.
    if (currentStudent?.flagStatus) return;
    if (autoConfirmDelay === null) return;
    const t = setTimeout(() => {
      // Only fire if we're still confirming the SAME student.
      const now = useOperatorStore.getState();
      if (
        now.state !== "confirming" ||
        !now.currentStudent ||
        now.currentStudent.id !== currentStudent.id
      )
        return;
      const rec = now.getRecommendation(
        now.currentStudent as Student,
        now._cachedPasses?.length ?? 0,
      );
      if (!rec) return;
      now.confirmScan(
        addToast,
        rec.direction,
        rec.reason as ExitReason | undefined,
        rec.entryType as "hosteller" | "day_scholar" | undefined,
        rec.entryButton as EntryButtonId | undefined,
      );
    }, autoConfirmDelay);
    return () => clearTimeout(t);
  }, [state, currentStudent, addToast, autoConfirmDelay]);

  // ── Keyboard escape hatches (active only while confirming) ───────────────
  // ESC cancel · 1/2 pick an alternative · Space confirm now ·
  // Q/B switch scan mode · M manual entry · F flag student · V voice assistant.
  useEffect(() => {
    if (state !== "confirming") return;
    const onKey = (e: KeyboardEvent) => {
      // Never hijack keys while the operator is typing in a text input.
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const s = useOperatorStore.getState();
      const stu = s.currentStudent as Student | null;
      const rec: Recommendation | null =
        stu && state === "confirming"
          ? s.getRecommendation(stu, s._cachedPasses?.length ?? 0)
          : null;

      switch (e.key) {
        case "Escape":
          cancelScan();
          break;
        case "1":
        case "2": {
          const idx = e.key === "1" ? 0 : 1;
          const alt = rec?.alternatives?.[idx];
          if (alt) {
            confirmScan(
              addToast,
              alt.direction,
              alt.payload.reason as ExitReason | string | undefined,
              alt.payload.entryType as "hosteller" | "day_scholar" | undefined,
              alt.payload.buttonId as EntryButtonId | undefined,
            );
          }
          break;
        }
        case " ":
        case "Spacebar":
          if (rec) {
            // Confirm immediately, skipping the auto-confirm countdown.
            confirmScan(
              addToast,
              rec.direction,
              rec.reason as ExitReason | undefined,
              rec.entryType as "hosteller" | "day_scholar" | undefined,
              rec.entryButton as EntryButtonId | undefined,
            );
          }
          break;
        case "q":
        case "Q":
          setScanMode("qr");
          break;
        case "b":
        case "B":
          setScanMode("barcode");
          break;
        case "m":
        case "M":
          setOperatorSubMode("manual");
          break;
        case "f":
        case "F":
          // Flag this student: cancel the in-flight confirm and surface a
          // toast so the operator (or the flag banner, once re-scanned) can
          // act on it. Keep it minimal per spec.
          if (stu) {
            addToast({
              variant: "warning",
              title: "Flagged",
              message: `${stu.name ?? stu.roll ?? "Student"} flagged for attention.`,
            });
          }
          cancelScan();
          break;
        case "v":
        case "V":
          setShowVoiceModal((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, cancelScan, confirmScan, addToast, setScanMode, setOperatorSubMode, setShowVoiceModal, cachedPassesLength]);

  const showWebAuthn = false;

  // Fix #5: prime the AudioContext on a real user gesture so the success beep
  // is audible on the very first scan (browsers keep the AudioContext
  // suspended until a gesture fires). The desktop desk now auto-launches the
  // camera on mount, so the first gesture is the operator tapping a mode-bar
  // chip / entering manual roll / confirming a scan.
  const primeAudioOnGesture = () => {
    primeAudio();
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
          // No gate assigned — show a placeholder; claim flow handled by shell.
          return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-sm text-[var(--text-muted)]">Gate assignment pending. Please complete the operator claim flow.</p>
            </div>
          );
        }
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Switchable Workspace */}
            <div className="min-h-[220px]">
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
                  {/* The 3-button viewfinder picker is gone — the camera is now
                      the primary surface and is always mounted in the desktop
                      render path below. In the idle "scan" sub-mode the
                      operator just points the camera (QR or Barcode via the
                      bottom mode bar); no separate viewfinder screen. */}

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
                  {/* Confirmation, success and error now render as z-60 overlays
                      that slide over the always-mounted live camera feed in the
                      desktop render path below. The flag banner (see
                      renderFlagBanner) pins above the confirmation card, and the
                      "No Active Verification" idle state is replaced by the live
                      camera itself. */}
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
      {/* Offline banner — shows when navigator.onLine is false */}
      <OfflineBanner />

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

      {/* 0-click scan engine: the camera is ALWAYS mounted on the desktop
          desk. It auto-launches on mount, stays warm across scans, and its
          decode loop pauses (active=false) while a scan is being confirmed
          or shown. Confirmation / success / error slide in as z-60 overlays
          above the live feed instead of unmounting the camera. */}
      <Scanner
        isOpen
        active={scannerActive}
        mode={scanMode}
        onClose={() => {}}
        onScan={handleQRScanned}
        onManualEntryClick={() => {
          primeAudioOnGesture();
          setOperatorSubMode("manual");
        }}
        gateId={gateId || user?.gateId}
      />

      {/* Confirmation overlay: flag banner pinned above the card. */}
      <AnimatePresence>
        {state === "confirming" && currentStudent && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-3 p-4 bg-black/40 pointer-events-none"
          >
            {currentStudent.flagStatus && renderFlagBanner()}
            <div className="pointer-events-auto w-full max-w-md">
              <ScanConfirmation
                student={currentStudent}
                campusStatus={currentCampusStatus}
                currentEntryType={operatorStore.entryType}
                lastOutReason={operatorStore.lastOutReason}
                onConfirm={async (dir, reason, entryType, buttonId) =>
                  await confirmScan(addToast, dir, reason, entryType, buttonId)
                }
                onCancel={cancelScan}
                isInline
                autoConfirmMs={autoConfirmDelay ?? undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay: green flash slides over the live feed; the parent
          auto-resets after 1500 ms, so no tap-to-dismiss is wired here. */}
      <AnimatePresence>
        {state === "success" && (
          <motion.div
            key="success-overlay"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-none"
          >
            <SuccessFlash
              autoDismissMs={500}
              direction={lastScan?.direction}
              reason={lastScan?.reason as string}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error overlay: operational exceptions slide over the live feed. */}
      <AnimatePresence>
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
              key="error-overlay"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 pointer-events-none"
            >
              <div className="pointer-events-auto scan-error w-full max-w-md p-5 rounded-2xl text-center space-y-3 bg-rose-500/10 border border-rose-500/30">
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
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Persistent bottom mode bar: QR / Barcode / Manual chips with their
          keyboard shortcuts. Switching QR<->Barcode just flips the Scanner's
          decode mode in place (stream stays warm); Manual drops into the
          hand-entry sub-mode. */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-70 flex gap-2 rounded-full bg-black/80 px-4 py-2 backdrop-blur items-center">
        <button
          type="button"
          onClick={() => {
            primeAudioOnGesture();
            setScanMode("qr");
          }}
          className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
            scanMode === "qr"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200"
          }`}
        >
          QR<span className="ml-1.5 text-[9px] font-semibold opacity-60">Q</span>
        </button>
        <button
          type="button"
          onClick={() => {
            primeAudioOnGesture();
            setScanMode("barcode");
          }}
          className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
            scanMode === "barcode"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200"
          }`}
        >
          Barcode<span className="ml-1.5 text-[9px] font-semibold opacity-60">B</span>
        </button>
        <button
          type="button"
          onClick={() => {
            primeAudioOnGesture();
            setOperatorSubMode("manual");
          }}
          className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${
            operatorSubMode === "manual"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "bg-white/5 text-slate-400 border border-white/10 hover:text-slate-200"
          }`}
        >
          Manual<span className="ml-1.5 text-[9px] font-semibold opacity-60">M</span>
        </button>
      </div>
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
