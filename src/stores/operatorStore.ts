/**
 * operatorStore — façade over the split operator stores (UI-audit fix 6).
 *
 * The single store from 2025 re-rendered the gate kiosk on every field
 * change ("too many re-renders" React #310). It is now split into:
 *
 *   useScanStore  — the in-flight scan flow + today's stats (scanStore.ts)
 *   useGateStore  — gate identity + live mode/lockdown (gateStore.ts)
 *
 * This module keeps the original export shape so the ~25 existing call
 * sites keep compiling: `useOperatorStore()` composes BOTH stores into one
 * object. New code should subscribe to the narrow store directly:
 *
 *   const gateMode = useGateStore((s) => s.gateMode);   // re-renders only on mode
 *   const student = useScanStore((s) => s.currentStudent);
 *
 * The full-object `useOperatorStore()` call is the footgun the original
 * comment warned about — use individual selectors from the split stores.
 */
import { useScanStore, type TodayStatsResult, type EntryButtonId } from "@/stores/scanStore";
import { useGateStore } from "@/stores/gateStore";
import type { ScanStore } from "@/stores/scanStore";
import type { GateState } from "@/stores/gateStore";
import type { Scan, Student, Gate, ScanDirection, ExitReason, CategoryBreakdown, OutingEntry } from "@/lib/types";
import type { GateMode } from "@/lib/gate-operations";
import type { LockdownInfo } from "@/components/operator/GateModeBanner";
import type { ToastData } from "@/components/ui/toast";
import type { Recommendation } from "@/lib/operator-recommend";

// Re-export the shared types so existing imports keep working.
export type { TodayStatsResult, EntryButtonId };

export interface OperatorState {
  // scan fields (from useScanStore)
  state: "idle" | "detecting" | "confirming" | "success" | "error";
  currentStudent: Student | null;
  currentCampusStatus: "IN" | "OUT" | null;
  lastOutReason: ExitReason | null;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  entryType: "hosteller" | "day_scholar" | null;
  photoVerificationDone: boolean;
  error: { message: string; code?: string; retryable?: boolean } | null;
  lastScan: Scan | null;
  todaysStats: { entries: number; exits: number; onCampus: number } | null;
  recentScans: Scan[];
  breakdown: CategoryBreakdown | null;
  outing: OutingEntry[];
  // gate fields (from useGateStore)
  gate: Gate | null;
  gateId: string | null;
  gateMode: GateMode;
  lockdown: LockdownInfo | null;
  lockdownDismissed: boolean;
  // actions
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason | null) => void;
  setEntryType: (entryType: "hosteller" | "day_scholar" | null) => void;
  clearError: () => void;
  confirmScan: (addToast: (toast: Omit<ToastData, "id">) => void, overrideDirection?: ScanDirection, overrideReason?: ExitReason | string, overrideEntryType?: "hosteller" | "day_scholar", overrideEntryButton?: EntryButtonId) => Promise<void>;
  cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
  getStatusStrip: () => {
    gate: string; entries: number; exits: number; shift: string; lastScanAgo: string;
    flagCount: number; health: "healthy" | "caution" | "critical";
    mode: GateMode; lockdown: LockdownInfo | null; scanningAllowed: boolean;
  };
  loadGateMode: () => Promise<void>;
  loadLockdown: () => Promise<void>;
  dismissLockdown: () => void;
  overrideGateMode: (mode: GateMode, reason: string) => Promise<void>;
  getRecommendation: (currentStudent: Student | null, approvedPassCount: number) => Recommendation;
}

// ── status-strip shape (from the original operatorStore) ──────────────────
interface OperatorStatusStrip {
  gate: string;
  entries: number;
  exits: number;
  shift: string;
  lastScanAgo: string;
  flagCount: number;
  health: "healthy" | "caution" | "critical";
  mode: import("@/lib/gate-operations").GateMode;
  lockdown: import("@/components/operator/GateModeBanner").LockdownInfo | null;
  scanningAllowed: boolean;
}

// ── legacy status-strip body (verbatim from the original operatorStore) ──
function getStatusStripImpl(
  scan: ReturnType<typeof import("@/stores/scanStore").useScanStore.getState>,
  gate: ReturnType<typeof import("@/stores/gateStore").useGateStore.getState>,
) {
  const s = { ...scan, ...gate };
    const now = new Date();
    const shift = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let lastScanAgo = "—";
    if (s.lastScan?.timestamp) {
      const diffMs = now.getTime() - new Date(s.lastScan.timestamp).getTime();
      const sec = Math.max(0, Math.floor(diffMs / 1000));
      lastScanAgo = sec < 5 ? "now" : sec < 60 ? `${sec}s` : Math.floor(sec / 60) < 60 ? `${Math.floor(sec / 60)}m` : `${Math.floor(sec / 3600)}h`;
    }
    // Red flags = recent operator-correction scans (principle 5: red = critical).
    const flagCount = s.recentScans.filter((sc) => sc.isCorrection).length;
    const online = s.gate?.isOnline ?? true;
    const health: OperatorStatusStrip["health"] = !online ? "critical" : flagCount > 0 ? "caution" : "healthy";
    return {
      gate: s.gate?.name || s.gateId || "Gate",
      entries: s.todaysStats?.entries ?? 0,
      exits: s.todaysStats?.exits ?? 0,
      shift,
      lastScanAgo,
      flagCount,
      health,
      mode: s.gateMode,
      lockdown: s.lockdown,
      scanningAllowed: s.gateMode === "OPEN" && s.lockdown === null,
    };
}





/**
 * Compose the two split stores into the legacy single-object shape.
 * Prefer subscribing to useScanStore / useGateStore directly with narrow
 * selectors — that is what actually stops the #310 re-render loop.
 */
export function useOperatorStore(): OperatorState {
  const scan = useScanStore();
  const gate = useGateStore();
  return {
    ...scan,
    ...gate,
    getStatusStrip: () => getStatusStripImpl(useScanStore.getState(), useGateStore.getState()),
  };
}

/**
 * Legacy compat: tests and the rare non-React call site that did
 * `useOperatorStore.getState()` (the old zustand hook form). This function
 * returns a composed object, not a store handle, so `.getState` is not
 * defined on the export. This shim preserves the contract.
 */
(useOperatorStore as unknown as { getState: () => ScanStore & GateState }).getState =
  () => ({ ...useScanStore.getState(), ...useGateStore.getState() } as ScanStore & GateState);
// setState shim — tests hydrate the composed state before driving a scan.
// Partial writes are routed to the sub-store that owns each key.
const SCAN_KEYS = new Set([
  "state", "currentStudent", "currentCampusStatus", "lastOutReason",
  "selectedDirection", "selectedReason", "dupScan", "etError", "lastScanData",
]);
(useOperatorStore as unknown as { setState: (partial: Partial<ScanStore & GateState>) => void }).setState =
  (partial) => {
    const scanPartial: Partial<ScanStore> = {};
    const gatePartial: Partial<GateState> = {};
    for (const [k, v] of Object.entries(partial)) {
      if (SCAN_KEYS.has(k)) (scanPartial as Record<string, unknown>)[k] = v;
      else (gatePartial as Record<string, unknown>)[k] = v;
    }
    if (Object.keys(scanPartial).length > 0) useScanStore.setState(scanPartial);
    if (Object.keys(gatePartial).length > 0) useGateStore.setState(gatePartial);
  };

// Legacy alias — the original export was a zustand hook. Call sites that do
// `useOperatorStore((s) => s.field)` still work because the hook form
// accepts a selector function when the caller wraps it; the object form is
// what most call sites use. For the handful that pass a selector, route
// through the individual stores instead.
//
// (The original `create<OperatorState>(...)` is no longer a single store —
// it is now a composed object. Selector-style calls
// `useOperatorStore((s) => s.gate)` will break at compile time with the
// new shape; fix those call sites to use useGateStore directly.)
