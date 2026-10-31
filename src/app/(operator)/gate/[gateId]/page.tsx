"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useOperatorGate } from "@/hooks/useOperatorGate";
import { normalizeScannedPayload } from "@/lib/barcode";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle, KeyRound, ShieldAlert, Wrench, Moon } from "lucide-react";
import { useOperatorStore } from "@/stores/operatorStore";
import type { Scan as ScanRecord, Student } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { SuccessFlash } from "@/components/operator/SuccessFlash";
import { Scanner } from "@/components/operator/Scanner";
import { ScanDetailModal } from "@/components/operator/ScanDetailModal";
import { GateConfirmCard } from "@/components/operator/GateConfirmCard";
import { GatePickerScreen } from "@/components/operator/GatePickerScreen";
import { OfflineBanner } from "@/components/operator/OfflineBanner";
import { primeAudio } from "@/lib/sound";
import { useAuthStore } from "@/stores/authStore";

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

  // Deep-link guard: an operator landing on /gate/<other> is bounced to
  // their own assigned gate (the shell blocks unassigned operators).
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

  // Option A landing rule: the desk opens YOUR gate. An unassigned operator
  // lands on the gate picker — never on "the first active gate" (their
  // scans there would fail against a gate they don't own).
  const gateId = isSpecialPath
    ? (user?.gateId || "")
    : (gateIdParam || user?.gateId || "");
  const needsAssignment = gateId === "";

  const { addToast } = useToast();

  // Subscribe via individual selectors, NOT the whole store object (a full
  // useOperatorStore() call re-renders this page on every store field
  // change and drives the "too many re-renders" React #310 loop).
  const state = useOperatorStore((s) => s.state);
  const currentStudent = useOperatorStore((s) => s.currentStudent);
  const currentCampusStatus = useOperatorStore((s) => s.currentCampusStatus);
  const lastScan = useOperatorStore((s) => s.lastScan);
  const error = useOperatorStore((s) => s.error);
  const startScan = useOperatorStore((s) => s.startScan);
  const cancelScan = useOperatorStore((s) => s.cancelScan);
  const reset = useOperatorStore((s) => s.reset);
  const setGate = useOperatorStore((s) => s.setGate);
  const confirmScan = useOperatorStore((s) => s.confirmScan);
  const lastOutReason = useOperatorStore((s) => s.lastOutReason);
  const gateState = useOperatorStore((s) => s.gate);

  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [activeLockdown, setActiveLockdown] = useState<any>(null);
  // Manual entry is ONE button that opens an inline sheet — not a mode.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualRollInput, setManualRollInput] = useState("");


  // Redirect unauthenticated users to operator login.
  useEffect(() => {
    if (authenticated) return;
    router.replace(`/login/operator?redirect=/gate/${gateId}`);
  }, [authenticated, gateId, router]);

  // Check lockdown status (named profile R15: LOCKDOWN-5s → kept at 10s).
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
  usePolling(checkLockdown, { intervalMs: 10_000 /* R15: LOCKDOWN-10s profile */ });

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

  const [gateName, setGateName] = useState("Loading...");
  const [gateMode, setGateMode] = useState<string>("OPEN");

  useEffect(() => {
    if (!gateId) return;
    fetch("/api/gates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const match = data.data.find(
            (g: any) => g.id === gateId || g.gate_code === gateId || g.gateCode === gateId || g.id === `gate-${gateId}`
          );
          setGateName(match?.name || gateState?.name || `Gate ${gateId}`);
        }
      })
      .catch(() => setGateName(gateState?.name || `Gate ${gateId}`));
  }, [gateId, gateState?.name]);

  useEffect(() => {
    // Poll gate operating mode (OPEN / CURFEW / MAINTENANCE) — the operator
    // must be able to see it even while scanning.
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
    const interval = setInterval(checkMode, 15_000);
    return () => clearInterval(interval);
  }, []);

  // Camera decode → start a scan flow (lockdown blocks all scans).
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

  // Manual entry submit: one button → inline input → same scan flow.
  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeLockdown) {
      addToast({ variant: "error", title: "Lockdown Active", message: "Scans are blocked during active campus lockdown." });
      return;
    }
    const raw = manualRollInput.trim().toUpperCase();
    const roll = raw.startsWith(">") ? raw.slice(1).trim() : raw;
    const normalized = normalizeScannedPayload(roll);
    if (normalized) {
      lastRollRef.current = normalized;
      startScan(normalized);
      setManualOpen(false);
    }
  };

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
  // a scan in flight (confirming / success / error) pauses it.
  const scannerActive = state === "idle" || state === "detecting";
  const canConfirm = state === "confirming" && currentStudent != null;

  return (
    <div className="relative min-h-[85vh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] pb-safe min-w-0">
      {/* ── Operational status + confirmation card (above the camera layer) ── */}
      <div className="fixed top-14 inset-x-0 z-60 flex flex-col items-center gap-2 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md space-y-2">
          <OfflineBanner />

          {gateMode === "MAINTENANCE" && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wide">Maintenance Mode Active</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Scheduled maintenance in progress. Routine scans are temporarily blocked.
              </p>
            </div>
          )}

          {gateMode === "CURFEW" && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm text-indigo-300 uppercase tracking-wide">Night Curfew Hours Active</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Curfew restrictions in effect. An override reason is required for student exits.
              </p>
            </div>
          )}

          {activeLockdown && (
            <div className="bg-rose-600 text-white p-4 rounded-xl border border-rose-700 shadow-lg flex items-center gap-3 animate-pulse">
              <ShieldAlert className="w-7 h-7 shrink-0 text-amber-200" />
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Campus Lockdown In Effect</h4>
                <p className="text-xs opacity-90">
                  {activeLockdown.message || "All gate scans are currently restricted by security administration."}
                </p>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {canConfirm && currentStudent && !manualOpen && (
            <GateConfirmCard
              key="confirm-card"
              student={currentStudent}
              campusStatus={currentCampusStatus}
              lastOutReason={lastOutReason}
              onConfirm={(dir) => { void confirmScan(addToast, dir); }}
              onCancel={cancelScan}
              onManualEntry={() => { cancelScan(); setManualOpen(true); }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Manual entry: one button, inline sheet (not a mode) ── */}
      {manualOpen && state === "idle" && !needsAssignment && (
        <div className="fixed bottom-28 inset-x-0 z-60 flex justify-center px-4 pointer-events-none">
          <form
            onSubmit={submitManual}
            className="pointer-events-auto w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 space-y-3 shadow-2xl"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Manual Student Lookup</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Type &gt; then roll number (or paste a roll number directly).
              </p>
            </div>
            <input
              type="text"
              maxLength={11}
              autoFocus
              value={manualRollInput}
              onChange={(e) => setManualRollInput(e.target.value.toUpperCase())}
              placeholder="e.g. >24JJ1A0501"
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-base font-mono font-bold tracking-wider text-[var(--text-primary)] uppercase placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!manualRollInput.trim() || !!activeLockdown}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-[var(--action-primary)] disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <KeyRound className="w-4 h-4" />
                <span>Verify Roll Number</span>
              </button>
              <button
                type="button"
                onClick={() => { setManualOpen(false); setManualRollInput(""); }}
                className="min-h-[44px] px-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-muted)] text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Success: one short green flash (250ms), then instant reset ── */}
      <AnimatePresence>
        {state === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 pointer-events-none"
          >
            <SuccessFlash
              autoDismissMs={250}
              direction={lastScan?.direction}
              reason={lastScan?.reason as string}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Failure: red, and it stays — the operator must acknowledge ── */}
      <AnimatePresence>
        {state === "error" && error && (() => {
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
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
            >
              <div className="scan-error w-full max-w-md p-5 rounded-2xl text-center space-y-3 bg-rose-500/10 border border-rose-500/30">
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
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
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
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors active:scale-[0.98] flex items-center justify-center"
                  >
                    {isAuthError ? "Dismiss & Sign In Again" : "Dismiss"}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Person detail sheet, opened from the transaction log */}
      <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />

      {/* ── The camera IS the page: full-bleed, z-50, auto-detecting ── */}
      <Scanner
        isOpen
        active={scannerActive}
        onClose={() => {}}
        onScan={handleQRScanned}
        onManualEntryClick={() => { primeAudioOnGesture(); setManualOpen(true); }}
        gateId={gateId}
      />

      {/* ── Unassigned operators: the picker, never a first-active gate ── */}
      {needsAssignment && (
        <div className="fixed inset-0 z-60 bg-[var(--bg-base)] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
              <div className="mb-4 space-y-1">
                <h1 className="text-lg font-bold text-[var(--text-primary)]">Your gate</h1>
                <p className="text-xs text-[var(--text-muted)]">
                  Pick the gate you work today, or claim it with the code your supervisor gave you.
                </p>
              </div>
              <GatePickerScreen />
            </div>
          </div>
        </div>
      )}

      {/* ── Two decisions, always in the same place ── */}
      {!needsAssignment && (
        <div className="fixed bottom-4 inset-x-0 z-70 flex flex-col items-center gap-2 px-4">
          <div className="w-full max-w-md grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => { void confirmScan(addToast, "IN"); }}
              className="min-h-[56px] rounded-xl bg-[var(--action-primary)] text-slate-950 font-extrabold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-25"
            >
              IN
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => { void confirmScan(addToast, "OUT"); }}
              className="min-h-[56px] rounded-xl bg-[var(--action-danger)] text-white font-extrabold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-25"
            >
              OUT
            </button>
          </div>
          <button
            type="button"
            disabled={state !== "idle" || manualOpen}
            onClick={() => { primeAudioOnGesture(); setManualOpen((o) => !o); }}
            className="min-h-[44px] px-5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur border border-slate-700 text-[11px] font-bold tracking-wide text-slate-300 flex items-center gap-2 disabled:opacity-40 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" /> Manual entry
          </button>
        </div>
      )}
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
