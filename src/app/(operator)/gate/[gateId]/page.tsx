"use client";

import { useEffect, useState, useRef, useCallback, Suspense, useMemo } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useLockdownStream } from "@/hooks/useLockdownStream";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useOperatorGate } from "@/hooks/useOperatorGate";
import { normalizeScannedPayload } from "@/lib/barcode";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, KeyRound, ArrowLeft, DoorOpen, ShieldOff, Siren } from "lucide-react";
// The two-decision rule: the bottom bar carries only IN / OUT. Manual entry
// is reachable via "Enter Roll Manually" in the Scanner's "Can't see the code?"
// row — no duplicate "Manual entry" button here (removed in this pass).

import { useScanStore } from "@/stores/scanStore";
import { useGateStore } from "@/stores/gateStore";
import type { Student } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { GatePickerScreen } from "@/components/operator/GatePickerScreen";
import { primeAudio } from "@/lib/sound";
import { useAuthStore } from "@/stores/authStore";
import { recommend } from "@/lib/operator-recommend";
import { ConfirmSheet } from "@/components/operator/sheet/ConfirmSheet";
import type { EntryButtonId } from "@/lib/operator-recommend";
import { GateModeBanner } from "@/components/operator/GateModeBanner";
import { ManualEntrySheet } from "@/components/operator/sheet/ManualEntrySheet";
import { PassPreviewFetcher } from "@/components/operator/PassPreview";
import { RecentScansSheet } from "@/components/operator/RecentScansSheet";
import { GeoFenceWarning, resolveKioskLocation, haversineMeters } from "@/components/operator/GeoFenceWarning";
import { BiometricPrompt } from "@/components/operator/BiometricPrompt";
import { formatTime } from "@/lib/utils";
import { useOperatorShiftClock } from "@/hooks/useOperatorShiftClock";
import type { GateMode } from "@/lib/gate-operations";
import { FrontlineSubjectSheet } from "@/components/nav/level1/FrontlinePivot";
import type { FrontlineSubject } from "@/components/nav/level1/FrontlinePivot";

/**
 * Option A gate desk — a scanning surface, not a dashboard.
 *
 * The camera is the page (full-bleed, z-50). Above it: operational banners
 * (offline / lockdown / curfew / maintenance) and the confirmation card,
 * top-anchored so the student's face stays visible. Below it: two
 * decisions, always in the same place — IN / OUT — plus one Manual entry
 * button. That is the whole UI.
 *
 * No mode bar (QR and 1D/2D barcodes auto-detect in one pass), no
 * auto-confirm (a flagged scan always costs a deliberate tap), no stats,
 * no recent-scans strip, no settings, no drawer, no voice assistant on the
 * desk. Stats live on /operator/stats; the log lives on /operator/transactions.
 */
function OperatorPageInner() {
  const params = useParams<{ gateId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { role, gateId: assignedGateId } = useOperatorGate();
  // While the auth store has not hydrated, `authenticated` is false even for
  // a valid kiosk session — the mount-redirect bounces logged-in operators to
  // /login on every deep-link load. Wait for hydration before acting.


  // Deep-link guard: an operator landing on /gate/<other> is bounced to
  // their own assigned gate. The redirect target must be a REAL gate —
  // resolve it from the server (fresh /api/auth/session user) rather
  // than the possibly-stale authStore value, and only when that gate
  // is active. A stale/null target means "show the picker with a claim
  // CTA", never "redirect to a nonexistent gate".
  const checkSession = useAuthStore((s) => s.checkSession);
  const refreshFromServer = useRef(false);
  useEffect(() => {
    if (role !== "operator") return;
    if (refreshFromServer.current) return;
    refreshFromServer.current = true;
    // checkSession re-hydrates user from /api/auth/session (including a
    // gate assignment made at /api/operator/claim-gate that the client
    // store has not yet picked up — issue #3).
    void checkSession().then((ok) => {
      if (!ok) refreshFromServer.current = false;
    });
  }, [role, checkSession]);

  useEffect(() => {
    if (role !== "operator") return;
    if (!assignedGateId) return;
    if (params?.gateId !== assignedGateId) {
      router.replace(`/gate/${assignedGateId}`);
    }
  }, [role, assignedGateId, params?.gateId, router]);

  const lastRollRef = useRef<string>("");
  const gateIdParam = params?.gateId;
  const isSpecialPath = gateIdParam === "history" || gateIdParam === "manual";

  const { authenticated, user, logout } = useAuth();
  // While the auth store has not hydrated yet, `authenticated` is false for
  // a freshly reloaded (but still logged-in) kiosk session. The redirect
  // effect below bounces such sessions to /login on mount — the flicker the
  // operator sees between the login page and the desk. Gate the redirect
  // on the hydrated flag so it only fires once we KNOW there is no
  // session, not while one is still being re-established.


  // Option A landing rule: the desk opens YOUR gate. An unassigned operator
  // lands on the gate picker — never on "the first active gate" (their
  // scans there would fail against a gate they don't own).
  //
  // While the store has not hydrated yet, `user` is null even for a
  // logged-in operator. Jumping the picker on `!user?.gateId` would
  // flash "Select Your Gate" for every authenticated visit until
  // rehydration lands — which is exactly the glitch between the login
  // page and the desk. Gate the unassigned check on `authenticated`
  // so it only applies after we KNOW the session state.
  const gateId = isSpecialPath
    ? (user?.gateId || "")
    : (gateIdParam || user?.gateId || "");
  const isUnassigned = authenticated && !user?.gateId;
  const needsAssignment = gateId === "" || isUnassigned;

  const { addToast } = useToast();

  // Subscribe via individual selectors, NOT the whole store object (a full
  // useOperatorStore() call re-renders this page on every store field
  // change and drives the "too many re-renders" React issue-310 loop).
  const state = useScanStore((s) => s.state);
  const currentStudent = useScanStore((s) => s.currentStudent);
  const currentCampusStatus = useScanStore((s) => s.currentCampusStatus);
  const lastScan = useScanStore((s) => s.lastScan);
  const error = useScanStore((s) => s.error);
  const startScan = useScanStore((s) => s.startScan);
  const cancelScan = useScanStore((s) => s.cancelScan);
  const reset = useScanStore((s) => s.reset);
  const setGate = useGateStore((s) => s.setGate);
  const confirmScan = useScanStore((s) => s.confirmScan);
  const lastOutReason = useScanStore((s) => s.lastOutReason);
  const gateState = useGateStore((s) => s.gate);
  const entryType = useScanStore((s) => s.entryType);
  const cachedPasses = useScanStore((s) => s._cachedPasses);
const recentScans = useScanStore((s) => s.recentScans);
const shift = useOperatorShiftClock();

  // Pure derivation — `recommend()` reads the scanned student's state and
  // returns { direction, reason, entryType, entryButton, confidence,
  // alternatives }. A first-ever scan (entryType === null) yields
  // [Home In] + [Day Scholar In], which is the exact set the server's
  // ENTRY_TYPE_REQUIRED check accepts — this is the fix for "operator not
  // working": without it the desk submitted a bare IN with no type and
  // got a 400 back.
  const recommendation = useMemo(() => {
    if (!currentStudent) return null;
    // The Person object built by findPersonByUniqueId exposes the curfew as
    // `hostelCurfewTime` (camelCase). Read that; keep a snake_case fallback in
    // case a raw DB row is ever passed through, so the curfew recommendation
    // actually receives live data instead of silently degrading to "unknown".
    const rawCurfew =
      (currentStudent as { hostelCurfewTime?: string | null }).hostelCurfewTime ??
      (currentStudent as { hostel_curfew_time?: string | null }).hostel_curfew_time;
    let curfewMinutes: number | null = null;
    if (typeof rawCurfew === "string" && /^\d{1,2}:\d{2}$/.test(rawCurfew.trim())) {
      const [hh, mm] = rawCurfew.trim().split(":").map(Number);
      if (Number.isFinite(hh) && Number.isFinite(mm)) curfewMinutes = hh * 60 + mm;
    }
    return recommend({
      campusStatus: currentCampusStatus,
      lastReason: lastOutReason,
      currentEntryType: entryType,
      hasApprovedPass: cachedPasses.length > 0,
      curfewMinutes,
      biometricReady: !!currentStudent.hasThumbprint,
    });
  }, [currentStudent, currentCampusStatus, lastOutReason, entryType, cachedPasses]);

  // Manual entry is ONE button that opens an inline sheet — not a mode.
  const [manualOpen, setManualOpen] = useState(false);
  // Scanner close (X): the Scanner's onClose just stops the camera; the page
  // stays on the kiosk. Give the X a real destination — back to the operator
  // dashboard — so it isn't a dead button.
  const [scannerOpen, setScannerOpen] = useState(true);


  // Redirect unauthenticated users to operator login.
  useEffect(() => {
    if (authenticated) return;
    router.replace(`/login/operator?redirect=/gate/${gateId}`);
  }, [authenticated, gateId, router]);

  // A1: live gate mode + lockdown now live in the operator store so the
  // status-strip banner (GateModeBanner) reads one source of truth.
  const storeGateMode = useGateStore((s) => s.gateMode);
  const storeLockdown = useGateStore((s) => s.lockdown);
  const storeLockdownDismissed = useGateStore((s) => s.lockdownDismissed);
  const dismissLockdown = useGateStore((s) => s.dismissLockdown);
  const overrideGateMode = useGateStore((s) => s.overrideGateMode);
  const loadGateMode = useGateStore((s) => s.loadGateMode);
  const loadLockdown = useGateStore((s) => s.loadLockdown);
  // Local state drives the banner + scanner gating; the store values are
  // mirrored into them on poll so existing JSX is untouched.
  const [activeLockdown, setActiveLockdown] = useState<any>(null);
  const [gateMode, setGateMode] = useState<string>("OPEN");

  useEffect(() => {
    void loadGateMode();
    void loadLockdown();
  }, [loadGateMode, loadLockdown]);
  usePolling(() => { void loadGateMode(); void loadLockdown(); }, {
    intervalMs: 10_000, /* R15: MODE/LOCKDOWN-10s profile */
  });

  useEffect(() => { setGateMode(storeGateMode); }, [storeGateMode]);
  useEffect(() => {
    setActiveLockdown(storeLockdown ? { ...storeLockdown, dismissed: storeLockdownDismissed } : null);
  }, [storeLockdown, storeLockdownDismissed]);

  // ── Rule-based lockdown: hard (camera-freeze) vs soft (camera stays live) ──
  // The legacy store `activeLockdown` is the hard global signal. The SSE
  // stream adds the full rule set: a rule is HARD (freezes the camera, blocks
  // every scan) when it is campus-wide or scoped to THIS gate; everything
  // else is SOFT (a scoped cohort rule) — the camera keeps running so
  // unaffected people can scan, and a matched person gets a 423 LOCKDOWN_BLOCKED.
  const { activeRules } = useLockdownStream(true);

  /**
   * A LOCKDOWN_BLOCKED (423) scan is ALREADY auto-logged server-side: the
   * recordScan catch writes a SCAN_REJECTED audit event carrying the
   * LOCKDOWN_BLOCKED code + the rule's public_message. This helper just
   * surfaces that to the operator (so they know it was recorded) — it does
   * not invent a new endpoint.
   */
  const logLockdownEscalation = useCallback(
    (err: { code?: string; message?: string } | null) => {
      addToast({
        variant: "success",
        title: "Blocked attempt logged",
        message: "The lockdown block was recorded to the security audit trail. Supervisor dashboards will surface it.",
      });
      void err;
    },
    [addToast],
  );

  const hardLockdown = useMemo(() => {
    // Legacy hard signal (campus/gate from /api/lockdown/active).
    if (activeLockdown) return true;
    const now = Date.now();
    return activeRules.some((r) => {
      if (r.status !== "ACTIVE") return false;
      if (r.expires_at && new Date(r.expires_at).getTime() <= now) return false;
      if (r.scope_type === "campus") return true;
      // `gate`-scoped rules no longer carry target_values in the desk-safe
      // stream, so they render in the restriction strip (soft) rather than
      // freezing the camera. The server's matchActiveLockdown (with full
      // target_values from the DB) still enforces gate blocks on scan.
      return false;
    });
  }, [activeLockdown, activeRules, gateId]);

  // Soft rules: scoped cohorts that should NOT freeze the camera.
  const scopedLockdowns = useMemo(() => {
    const now = Date.now();
    return activeRules.filter((r) => {
      if (r.status !== "ACTIVE") return false;
      if (r.expires_at && new Date(r.expires_at).getTime() <= now) return false;
      if (r.scope_type === "campus") return false; // hard (via activeLockdown)
      // Everything else — gate / role / persona / department / hostel_block /
      // class_section / user — keeps the camera live.
      return true;
    });
  }, [activeRules]);

  // Human labels for the restriction strip — never raw target_values UUIDs.
  const restrictionSummary = useMemo(() => {
    if (scopedLockdowns.length === 0) return "";
    const SCOPE_HUMAN: Record<string, string> = {
      role: "Role", persona: "Persona", department: "Dept",
      hostel_block: "Hostel", class_section: "Class", user: "Individual",
    };
    return scopedLockdowns
      .map((r) => {
        const dir = r.direction === "BOTH" ? "IN+OUT" : r.direction;
        const label =
          r.scope_type === "user"
            ? "Individual"
            : `${SCOPE_HUMAN[r.scope_type] ?? r.scope_type} (${dir} ${r.direction === "OUT" ? "Blocked" : r.direction === "IN" ? "Blocked" : "Restricted"})`;
        return r.public_message ? `${label} · ${r.public_message}` : label;
      })
      .join("  ·  ");
  }, [scopedLockdowns]);

  // Special routing shortcuts (/gate/history & /gate/manual) resolve to the
  // operator's own gate — or the desk (picker) when unassigned.
  useEffect(() => {
    if (!isSpecialPath) return;
    const targetGate = user?.gateId;
    if (targetGate) {
      if (gateIdParam === "history") {
        router.replace(`/gate/${targetGate}`);
      } else {
        router.replace(`/gate/${targetGate}?mode=manual`);
      }
    } else {
      router.replace("/operator");
    }
  }, [isSpecialPath, gateIdParam, user?.gateId, router]);

  // Legacy deep-link ?tab=history → transaction log route.
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "history") {
      router.replace("/operator/transactions");
    }
  }, [searchParams, router]);

  // ?mode=manual opens the inline manual-entry sheet.
  useEffect(() => {
    if (searchParams?.get("mode") === "manual") setManualOpen(true);
  }, [searchParams]);

  // Init the gate in the store (per-gate stream cache + gate metadata).
  const gateInitializedRef = useRef<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!authenticated || !gateId) return;
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

  const [gateName, setGateName] = useState("Loading gate…");

  useEffect(() => {
    if (!gateId) return;
    fetch("/api/gates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const match = data.data.find(
            (g: any) => g.id === gateId || g.gate_code === gateId || g.gateCode === gateId || g.id === `gate-${gateId}`
          );
          // NEVER fall back to the raw gateId/UUID — show a neutral label
          // instead (UUIDs are sysadmin-only per the operator audit).
          setGateName(match?.name || gateState?.name || "Assigned Gate");
        } else {
          setGateName(gateState?.name || "Assigned Gate");
        }
      })
      .catch(() => setGateName(gateState?.name || "Assigned Gate"));
  }, [gateId, gateState?.name]);

  // Gate mode + lockdown now poll through the operator store (A1) — the
  // local `gateMode` / `activeLockdown` state above is populated from the
  // store so the existing banner JSX is unchanged.

  // Camera decode → start a scan flow (lockdown blocks all scans).
  const handleQRScanned = useCallback((scannedPayload: string) => {
    if (hardLockdown) {
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
  }, [hardLockdown, addToast, startScan]);

  // Keep a test handle for the decode path (used by integration tests).
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__handleQRScannedForTesting = handleQRScanned;
    }
  }, [handleQRScanned]);

  // Success flash: 250ms, then INSTANT reset. The recent-scan log is the
  // confirmation trail — the desk never holds a green screen.
  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => {
      reset();
    }, 250);
    return () => clearTimeout(t);
  }, [state, reset]);

  // ── O8: pass preview on OUT confirm ─────────────────────────────────
  // When the operator is on an OUT decision, fetch the scanned roll's pass
  // (advisory, not load-bearing) and surface it above the button bar.
  const [passPreview, setPassPreview] = useState<{ roll: string; reason: string; ticketNumber?: string } | null>(null);
  const [biometricPending, setBiometricPending] = useState(false);
  // L1 FrontlinePivot: subject sheet for idle-state recent-scan / pass-preview taps.
  const [frontlineSubject, setFrontlineSubject] = useState<FrontlineSubject | null>(null);
  const doConfirm = useCallback(
    (dir: "IN" | "OUT", reason?: string, et?: "hosteller" | "day_scholar", buttonId?: EntryButtonId) => {
      void confirmScan(addToast, dir, reason, et, buttonId as EntryButtonId);
      // O8: show the pass preview for OUT scans; IN scans don't need one.
      if (dir === "OUT" && currentStudent) {
        const reasonLabel = reason ?? "home_out";
        setPassPreview({ roll: currentStudent.roll ?? "", reason: reasonLabel, ticketNumber: cachedPasses.find((p) => p?.roll === currentStudent?.roll)?.id });
        // O10: high-risk OUT = home_out with an approved pass.
        if (reasonLabel === "home_out" && cachedPasses.length > 0) setBiometricPending(true);
      } else {
        setPassPreview(null);
        setBiometricPending(false);
      }
    },
    [confirmScan, addToast, currentStudent, cachedPasses],
  );

  // ── O11: geo-fence intercept (gates with a configured fence radius) ──
  // Before an OUT scan at a geofenced gate, check the kiosk's GPS distance
  // to the gate. If outside the allowed radius, show the warning dialog
  // with a "Continue anyway" escape hatch. Advisory only: a null GPS
  // (permission denied / no receiver) never hard-blocks a scan.
  const [geoFence, setGeoFence] = useState<{ distanceMeters: number; pending: [string, string?, ("hosteller" | "day_scholar")?, EntryButtonId?] } | null>(null);
  const doConfirmWithGeo = useCallback(
    (dir: "IN" | "OUT", reason?: string, et?: "hosteller" | "day_scholar", buttonId?: EntryButtonId) => {
      const fenceLat = gateState?.latitude;
      const fenceLon = gateState?.longitude;
      const fenceRadius = gateState?.allowedRadiusMeters;
      if (dir === "OUT" && fenceLat != null && fenceLon != null) {
        const allowed = fenceRadius ?? 200;
        resolveKioskLocation()
          .then(async (loc) => {
            if (!loc) return doConfirm(dir, reason, et, buttonId);
            const distance = haversineMeters(loc.latitude, loc.longitude, fenceLat, fenceLon);
            if (distance > allowed) {
              // Hold the confirm; "Continue anyway" replays it with the pending payload.
              setGeoFence({ distanceMeters: distance, pending: [dir, reason, et, buttonId] });
            } else {
              doConfirm(dir, reason, et, buttonId);
            }
          })
          .catch(() => doConfirm(dir, reason, et, buttonId));
        return;
      }
      doConfirm(dir, reason, et, buttonId);
    },
    [doConfirm, gateState],
  );

  // Manual entry submit now lives in <ManualEntrySheet onScan={...}> (Zone 3
  // sheet) — the inline form + submitManual are gone.

  // Keyboard escape hatches (active only while confirming a scan):
  //   ESC cancel · M manual entry · F flag the student.
  // No auto-confirm keys: confirming always costs a deliberate IN/OUT tap.
  useEffect(() => {
    if (state !== "confirming") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      switch (e.key) {
        case "Escape":
          cancelScan();
          break;
        case "m":
        case "M":
          cancelScan();
          setManualOpen(true);
          break;
        case "f":
        case "F": {
          const stu = currentStudent as Student | null;
          if (stu) {
            addToast({
              variant: "warning",
              title: "Flagged",
              message: `${stu.name ?? stu.roll ?? "Student"} flagged for attention.`,
            });
          }
          cancelScan();
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, cancelScan, addToast, currentStudent]);

  // Prime the AudioContext on a real user gesture so the success beep is
  // audible on the very first scan.
  const primeAudioOnGesture = () => {
    primeAudio();
  };

  // The camera's decode loop only runs while idle or actively detecting —
  // a scan in flight (confirming / success / error) pauses it. MAINTENANCE
  // mode and an active lockdown also stop the camera (A1 gate).
  const scannerActive =
    (state === "idle" || state === "detecting") &&
    gateMode !== "MAINTENANCE" &&
    !hardLockdown;
  const canConfirm = state === "confirming" && currentStudent != null;

  // Zone-1 status dot: derived from live gate mode + lockdown (no new data).
  const statusDot = hardLockdown
    ? { label: "LOCKDOWN", cls: "bg-rose-500", ring: "ring-rose-500/30", pulse: true }
    : scopedLockdowns.length > 0
    ? { label: "RESTRICTED", cls: "bg-amber-400", ring: "ring-amber-400/30", pulse: true }
    : gateMode === "CURFEW"
    ? { label: "CURFEW", cls: "bg-amber-400", ring: "ring-amber-400/30", pulse: false }
    : gateMode === "MAINTENANCE"
    ? { label: "MAINTENANCE", cls: "bg-amber-400", ring: "ring-amber-400/30", pulse: false }
    : gateMode === "OPEN"
    ? { label: "OPEN", cls: "bg-emerald-500", ring: "ring-emerald-500/30", pulse: false }
    : { label: "OPEN", cls: "bg-neutral-500", ring: "ring-neutral-500/30", pulse: false };

  // The strict 3-zone viewport: nothing is position:fixed over the viewfinder
  // except self-contained bottom sheets (z-50). Zone 1 (top HUD, shrink-0),
  // Zone 2 (camera, flex-1 min-h-0), Zone 3 (bottom dock, shrink-0).
  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col bg-neutral-950 text-neutral-100 min-w-0">
      {/* ═══════════ ZONE 1 — TOP HUD (shrink-0, safe-area top) ═══════════ */}
      {!needsAssignment && (
        <div className="shrink-0 z-30 bg-neutral-950/90 border-b border-neutral-800 pt-[env(safe-area-inset-top,0px)]">
          <div className="h-12 flex items-center justify-between gap-2 px-3">
            {/* Left: gate name + live status dot */}
            <div className="flex items-center gap-2 min-w-0">
              <DoorOpen className="w-4 h-4 text-neutral-400 shrink-0" aria-hidden />
              <span className="text-sm font-bold text-white truncate">{gateName}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide ring-1 ${statusDot.cls} ${statusDot.ring} ${statusDot.pulse ? "animate-pulse" : ""}`}
              >
                {statusDot.label}
              </span>
            </div>
            {/* Right: shift clock + Desk exit */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs tabular-nums text-neutral-300">
                {shift.start
                  ? `${formatTime(shift.start.toISOString())}${shift.end ? "–" + formatTime(shift.end.toISOString()) : ""}`
                  : "shift opens on first scan"}
              </span>
              <button
                type="button"
                onClick={() => router.push("/operator")}
                className="flex items-center gap-1 min-h-[44px] px-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 active:scale-[0.98] transition"
                aria-label="Exit to operator desk"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Desk
              </button>
            </div>
          </div>
          {/* GateModeBanner in normal flow (shrink-0) — never position:fixed */}
          <div className="px-3 pb-2">
            <GateModeBanner
              mode={gateMode as GateMode}
              lockdown={activeLockdown}
              scanningAllowed={gateMode === "OPEN" && !hardLockdown}
              onOverrideMaintenance={(reason) => overrideGateMode("OPEN", reason)}
              onDismissLockdown={dismissLockdown}
              compact
            />
            {/* Scoped restriction strip — camera stays LIVE for these. Shows a
                compact amber summary of the scoped cohort rules (human labels
                only, never target UUIDs). A matched scan returns 423. */}
            {!hardLockdown && restrictionSummary && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-[11px] font-medium text-amber-300">
                <span className="shrink-0 font-bold tracking-wide">RESTRICTED:</span>
                <span className="truncate">{restrictionSummary}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ ZONE 2 — CAMERA VIEWFINDER (flex-1 min-h-0) ═══════════ */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <Scanner
          isOpen={scannerOpen && !needsAssignment}
          active={scannerActive && !needsAssignment && scannerOpen}
          onClose={() => { setScannerOpen(false); router.push("/operator"); }}
          onScan={handleQRScanned}
          onManualEntryClick={() => { primeAudioOnGesture(); setManualOpen(true); }}
          gateId={gateId}
        />

        {/* Camera-paused state (X pressed): re-open CTA, not a frozen desk */}
        {!scannerOpen && !needsAssignment && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-neutral-950">
            <div className="w-full max-w-sm rounded-xl bg-neutral-900 border border-neutral-800 p-5 text-center space-y-3">
              <p className="text-sm font-bold text-white">Scanner paused</p>
              <p className="text-xs text-neutral-400">
                Camera stopped. Re-open it to continue scanning, or return to the dashboard.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setScannerOpen(true); setManualOpen(false); }}
                  className="min-h-[48px] rounded-lg bg-emerald-600 text-white font-bold text-sm active:scale-[0.99]"
                >
                  Open scanner
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/operator")}
                  className="min-h-[48px] rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-sm active:scale-[0.99]"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unassigned operators: the picker fills the viewfinder zone */}
        {needsAssignment && (
          <div className="absolute inset-0 z-20 bg-neutral-950 overflow-y-auto pt-[env(safe-area-inset-top,0px)]">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="w-full max-w-lg">
                <div className="mb-4 space-y-1">
                  <h1 className="text-lg font-bold text-white">Your gate</h1>
                  <p className="text-xs text-neutral-400">
                    Pick the gate you work today, or claim it with the code your supervisor gave you.
                  </p>
                </div>
                <GatePickerScreen />
              </div>
            </div>
          </div>
        )}

        {/* Idle-only "verify latest scan" chip (in-flow, not a fixed overlay) */}
        {state === "idle" && recentScans.length > 0 && !needsAssignment && scannerOpen && (
          <button
            type="button"
            onClick={() => {
              const latest = recentScans[0];
              if (!latest) return;
              setFrontlineSubject({
                id: latest.id,
                name: latest.name || latest.roll,
                code: latest.roll,
                statusTag: latest.direction === "IN" ? "ENTRY" : "EXIT",
                locationOrScope: latest.gateName || gateName,
              });
            }}
            className="absolute top-3 right-3 z-20 min-h-[44px] px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors"
            aria-label="Open frontline subject sheet for latest scan"
          >
            Verify subject
          </button>
        )}
      </div>

      {/* ═══════════ ZONE 3 — BOTTOM ACTION DOCK (shrink-0, safe-area bottom) ═══════════ */}
      {!needsAssignment && scannerOpen && (
        <div className="shrink-0 z-30 bg-neutral-950 border-t border-neutral-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="w-full max-w-md mx-auto space-y-2">
            {/* Row 1: two large high-contrast decision buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canConfirm}
                aria-label="Confirm entry (IN)"
                onClick={() => { void doConfirmWithGeo("IN"); }}
                className="min-h-[52px] rounded-xl bg-emerald-600 text-white font-extrabold text-lg flex flex-col items-center justify-center gap-0.5 active:scale-[0.99] disabled:opacity-30"
              >
                <span>IN</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">Entry</span>
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                aria-label="Confirm exit (OUT)"
                onClick={() => { void doConfirmWithGeo("OUT"); }}
                className="min-h-[52px] rounded-xl bg-amber-600 text-white font-extrabold text-lg flex flex-col items-center justify-center gap-0.5 active:scale-[0.99] disabled:opacity-30"
              >
                <span>OUT</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/80">Exit</span>
              </button>
            </div>
            {/* Row 2: one clean secondary action — always clickable */}
            <button
              type="button"
              onClick={() => { primeAudioOnGesture(); setManualOpen(true); }}
              className="w-full min-h-[52px] rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-100 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <KeyRound className="w-4 h-4" />
              Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* ── Confirmation / preview / manual sheets: bottom sheets (z-50) ── */}
      <AnimatePresence>
        {canConfirm && currentStudent && recommendation && !manualOpen && (
          <ConfirmSheet
            key="confirm-sheet"
            student={currentStudent}
            recommendation={recommendation}
            currentEntryType={entryType}
            lastOutReason={lastOutReason}
            isOpen={true}
            autoConfirmMs={null}
            onConfirm={(dir, reason, et, buttonId) => doConfirmWithGeo(dir, reason, et, buttonId)}
            onCancel={cancelScan}
          />
        )}
      </AnimatePresence>

      {manualOpen && !needsAssignment && (
        <ManualEntrySheet
          isOpen
          gateId={gateId}
          onClose={() => setManualOpen(false)}
          onScan={(roll) => {
            if (hardLockdown) {
              addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
              return;
            }
            const normalized = normalizeScannedPayload(roll);
            if (normalized) {
              lastRollRef.current = normalized;
              startScan(normalized);
              setManualOpen(false);
            }
          }}
        />
      )}

      {/* Success: short flash (250ms), then instant reset */}
      <AnimatePresence>
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
          >
            <SuccessFlash
              autoDismissMs={1800}
              direction={lastScan?.direction}
              reason={lastScan?.reason as string}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lockdown block (423 LOCKDOWN_BLOCKED): red card that STAYS until the
          operator acknowledges + auto-logs an escalation. Distinct from the
          generic scan-failure card because the operator's next action differs
          (log the blocked attempt, keep scanning the next person — do NOT
          retry the same person). */}
      <AnimatePresence>
        {state === "error" && error?.code === "LOCKDOWN_BLOCKED" && (
          <motion.div
            key="lockdown-block"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70"
          >
            <div className="surface-card w-full max-w-md p-5 text-center space-y-3 bg-red-950/40 border border-red-500/40 rounded-xl">
              <div className="size-10 rounded-full mx-auto bg-red-500/25 text-red-300 flex items-center justify-center">
                <ShieldOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-red-300">Movement Blocked</h3>
                <p className="text-xs text-red-200/80">
                  {typeof error.message === "string" ? error.message : "This person is restricted by an active lockdown rule."}
                </p>
                <p className="text-[11px] text-red-200/60">
                  They remain on the active blocklist. Keep the scanner running for the next person.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void logLockdownEscalation(error);
                    reset(); // next person can scan immediately
                  }}
                  className="min-h-[48px] px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <Siren className="w-3.5 h-3.5" /> Acknowledge + Log Escalation
                </button>
                <button
                  type="button"
                  onClick={() => reset()}
                  className="min-h-[48px] px-4 py-2 bg-neutral-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center active:scale-[0.98]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Failure: red, stays until acknowledged (always resets to idle) */}
      <AnimatePresence>
        {state === "error" && error && error.code !== "LOCKDOWN_BLOCKED" && (() => {
          const isAuthError =
            error.code === "UNAUTHORIZED" ||
            error.code === "SESSION_EXPIRED" ||
            (typeof error.message === "string" &&
              /token|session|unauthorized|sign in|authentication/i.test(error.message));
          const canRetry = error.retryable === true;
          const isNetworkError =
            error.code === "NETWORK_ERROR" ||
            error.code === "TIMEOUT" ||
            error.code === "OFFLINE_BLOCKED" ||
            error.code === "NETWORK";
          return (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60"
            >
              <div className="surface-card w-full max-w-md p-5 text-center space-y-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <div className="size-6 rounded-full mx-auto bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-rose-400">
                    {isAuthError ? "Verification Failed"
                      : error.code === "NOT_FOUND" ? "Person Not Found"
                      : error.code === "ACCOUNT_INACTIVE" ? "Verification Failed (Account Inactive)"
                      : error.code === "DUPLICATE" ? "Duplicate Scan"
                      : isNetworkError ? "Network Error" : "Verification Failed"}
                  </h3>
                  <p className="text-xs text-neutral-300">{error.message}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {canRetry && (
                    <button
                      type="button"
                      id="retry-btn"
                      onClick={() => {
                        if (currentStudent) { void confirmScan(addToast, undefined); }
                        else if (lastRollRef.current) { startScan(lastRollRef.current); }
                        else { reset(); }
                      }}
                      className="min-h-[48px] px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (isAuthError) logout();
                      else reset(); // never leave the desk stuck on a failed scan
                    }}
                    className="min-h-[48px] px-4 py-2 bg-rose-600 text-white font-semibold text-xs rounded-lg flex items-center justify-center active:scale-[0.98]"
                  >
                    {isAuthError ? "Dismiss & Sign In Again" : "Dismiss"}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* O8: OUT pass preview (advisory). Positioned as a bottom-sheet above the dock. */}
      {passPreview && (
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+8rem)] z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md">
            <PassPreviewFetcher roll={passPreview.roll} reason={passPreview.reason} />
          </div>
        </div>
      )}

      {/* O10: biometric gate for high-risk OUT */}
      {passPreview && biometricPending && (
        <BiometricPrompt
          ticketNumber={passPreview.ticketNumber ?? ""}
          roll={passPreview.roll}
          mode="thumb"
          onVerified={() => setBiometricPending(false)}
          onCancel={() => setBiometricPending(false)}
        />
      )}

      {/* O11: geo-fence warning (advisory "continue anyway" escape hatch) */}
      {geoFence && (
        <GeoFenceWarning
          distanceMeters={geoFence.distanceMeters}
          allowedRadiusMeters={gateState?.allowedRadiusMeters ?? 200}
          gateName={gateName}
          onContinue={() => {
            const [dir, reason, et, buttonId] = geoFence.pending;
            setGeoFence(null);
            doConfirm(dir as "IN" | "OUT", reason, et, buttonId);
          }}
          onCancel={() => {
            setGeoFence(null);
            cancelScan();
          }}
        />
      )}

      {/* O9: recent scans sheet + L1 frontline subject sheet (idle-only) */}
      <RecentScansSheet scans={recentScans} gateName={gateName} />
      {state === "idle" && (
        <FrontlineSubjectSheet
          subject={frontlineSubject}
          onClose={() => setFrontlineSubject(null)}
        />
      )}
    </div>
  );
}

export default function OperatorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading…</div>}>
      <OperatorPageInner />
    </Suspense>
  );
}
