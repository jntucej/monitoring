/**
 * Zustand store for the Gate Operator screen state.
 * Manages scan flow: detecting → confirming → reason selection.
 */
import { create } from "zustand";
import { playAudioFeedback } from "@/lib/sound";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { addScan } from "@/lib/scan-queue";
import type { Scan, Person, Student, Gate, ScanDirection, ExitReason, CategoryBreakdown, OutingEntry } from "@/lib/types";
import type { ToastData } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { validateRollNumber } from "@/lib/rollNumber";
import { getClientLocation, getClientSysTag } from "@/lib/geo";

/**
 * Canonicalize any stored entry-type form to the two lowercase values the
 * server accepts ("hosteller" | "day_scholar"), or null when absent.
 */
function normalizeEntryType(value: unknown): "hosteller" | "day_scholar" | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (s === "hosteller" || s === "hostel" || s === "hm" || s === "hf") return "hosteller";
  if (s === "day_scholar" || s === "day scholar" || s === "dm" || s === "df") return "day_scholar";
  return null;
}

/**
 * Fetch today's operator gate stats from the server.
 *
 * The browser's anon Supabase client is blocked by RLS from reading the
 * auth-protected `movement_logs` / `daily_stats` tables, so the page must ask a
 * server route (which runs with the service client) for today's counts.
 * Falls back to the local `statsToday()` only if the request itself fails.
 */
async function fetchTodayStats(gateId?: string, signal?: AbortSignal): Promise<{
  entries: number;
  exits: number;
  onCampus: number;
  recentScans: Scan[];
  breakdown: CategoryBreakdown | null;
  outing: OutingEntry[];
} | null> {
  try {
    const authStore = useAuthStore.getState();
    const token = authStore.token;
    if (!token) return null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const sessionToken = authStore.user?.currentSessionToken;
    if (sessionToken) headers["X-Session-Token"] = sessionToken;

    const url = gateId ? `/api/operator/stats?gateId=${encodeURIComponent(gateId)}` : "/api/operator/stats";
    const res = await fetch(url, { headers, cache: "no-store", signal });
    if (!res.ok) return null;
    const result = await res.json();
    if (!result?.success || !result?.data) return null;
    return {
      entries: result.data.entries ?? 0,
      exits: result.data.exits ?? 0,
      onCampus: result.data.onCampus ?? 0,
      recentScans: result.data.recentScans ?? [],
      breakdown: result.data.breakdown ?? null,
      outing: result.data.outing ?? [],
    };
  } catch {
    return null;
  }
}


type ScanState = "idle" | "detecting" | "confirming" | "selecting_reason" | "success" | "error";

// Error info returned from the store on failed scans
interface ScanError {
  message: string;
  code?: string;
  /** True when pressing Retry can realistically recover (network issues, timeouts, duplicates). */
  retryable?: boolean;
  /** True when the scan was captured locally and will sync when the network returns. */
  queued?: boolean;
}

export interface TodayStatsResult {
  entries: number;
  exits: number;
  onCampus: number;
  recentScans: Scan[];
  breakdown: CategoryBreakdown | null;
  outing: OutingEntry[] | null;
}

interface OperatorState {
  // Current scan flow
  state: ScanState;
  currentStudent: Student | null;
  /** Authoritative current IN/OUT condition of the scanned person (from campus_occupancy). */
  currentCampusStatus: "IN" | "OUT" | null;
  /**
   * Reason recorded on the person's most recent OUT scan. Drives the hosteller
   * re-entry button label: daily_outing → "Return to Hostel", else "Home In".
   */
  lastOutReason: ExitReason | null;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  /**
   * Live entry-type selection carried through the scan flow. Populated from the
   * person's stored student_details.current_entry_type in startScan, and set
   * by the operator on IN-scan confirmations. Reset to null in reset/cancelScan.
   */
  entryType: "hosteller" | "day_scholar" | null;
  photoVerificationDone: boolean;
  error: ScanError | null;

  // Data
  lastScan: Scan | null;
  todaysStats: { entries: number; exits: number; onCampus: number } | null;
  recentScans: Scan[];
  /** Inside-campus counts per person category + outing list */
  breakdown: CategoryBreakdown | null;
  outing: OutingEntry[];
  gate: Gate | null;
  gateId: string | null;

  _scanGeneration: number;
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason | null) => void;
  setEntryType: (entryType: "hosteller" | "day_scholar" | null) => void;
  clearError: () => void;
  
  confirmScan: (addToast: (toast: Omit<ToastData, "id">) => void, overrideDirection?: ScanDirection, overrideReason?: ExitReason | string, overrideEntryType?: "hosteller" | "day_scholar") => Promise<void>;
    cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
  _fetchTodayStats: () => Promise<TodayStatsResult>;
}

let activeStatsFetchCtrl: AbortController | null = null;

const EMPTY_BREAKDOWN: CategoryBreakdown = {
  hostellers: { inside: 0, inToday: 0, outToday: 0 },
  dayscholars: { inside: 0, inToday: 0, outToday: 0 },
  facultyStaff: { inside: 0, inToday: 0, outToday: 0 },
  authorities: { inside: 0, inToday: 0, outToday: 0 },
  visitors: { inside: 0, inToday: 0, outToday: 0 },
  others: { inside: 0, inToday: 0, outToday: 0 },
};

let scanAbortController: AbortController | null = null;

export const useOperatorStore = create<OperatorState>((set, get) => ({
  state: "idle",
  currentStudent: null,
  currentCampusStatus: null,
  lastOutReason: null,
  selectedDirection: "IN",
  selectedReason: null,
  entryType: null,
  photoVerificationDone: false,
  error: null,

  lastScan: null,
  todaysStats: null,
  recentScans: [],
  breakdown: null,
  outing: [],
  gate: null,
  gateId: null,
  _scanGeneration: 0,

  startScan: async (roll: string) => {
    const cleanRoll = roll.trim().toUpperCase();
    if (!cleanRoll) return;

    // Increment generation so any in-flight startScan/confirmScan callbacks
    // for the previous scan are dropped once we hit a stale check.
    const gen = get()._scanGeneration + 1;
    set({ _scanGeneration: gen });

    if (scanAbortController) {
      scanAbortController.abort();
    }
    scanAbortController = new AbortController();
    const signal = scanAbortController.signal;

    set({ state: "detecting", error: null, photoVerificationDone: false, currentStudent: null });

    const authStore = useAuthStore.getState();
    const token = authStore.token;
    const sessionToken = authStore.user?.currentSessionToken;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (sessionToken) {
      headers["X-Session-Token"] = sessionToken;
    }

    try {
      const res = await fetch(`/api/persons/${encodeURIComponent(cleanRoll)}`, { headers, signal });
      if (get()._scanGeneration !== gen) return;
      const result = await res.json().catch(() => null);
      if (get()._scanGeneration !== gen) return;

      if (res.status === 401 || result?.error?.code === "SESSION_EXPIRED" || result?.error?.code === "UNAUTHORIZED") {
        authStore.logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }

      if (!res.ok || !result?.success) {
        const errorMsg =
          result?.error?.message ||
          (res.status === 404
            ? `Person with ID "${cleanRoll}" not found in database.`
            : "Failed to fetch person details.");
        const errorCode = result?.error?.code || (res.status === 404 ? "NOT_FOUND" : "ERROR");
        if (get()._scanGeneration !== gen) return;
        set({
          state: "error",
          error: { message: errorMsg, code: errorCode },
          currentStudent: null,
        });
        return;
      }
      const person: Person = result.data.person;

      // Check account status — do not allow inactive/suspended accounts to proceed
      if (person.status && person.status.toUpperCase() !== "ACTIVE") {
        if (get()._scanGeneration !== gen) return;
        set({
          state: "error",
          error: {
            message: `Verification Denied: Student account is ${person.status}. Gate access denied.`,
            code: "ACCOUNT_INACTIVE",
          },
          currentStudent: person,
        });
        return;
      }

      // Use authoritative campus occupancy status to suggest next direction
      const campusStatus = result.data.campusStatus;
      let direction: ScanDirection;
      if (campusStatus) {
        direction = campusStatus === "IN" ? "OUT" : "IN";
      } else if (result.data.lastScan?.direction) {
        direction = result.data.lastScan.direction === "IN" ? "OUT" : "IN";
      } else {
        direction = "IN";
      }

      if (get()._scanGeneration !== gen) return;
      // Derive the most recent OUT reason when occupancy is OUT, so the
      // hosteller re-entry button can distinguish "Return to Hostel" (came out
      // for an outing) from "Home In" (came out for home / day pass).
      const lastScanData: any = result.data.lastScan ?? null;
      const lastOutReason: ExitReason | null =
        campusStatus === "OUT" && lastScanData?.direction === "OUT" && lastScanData.reason
          ? (lastScanData.reason as ExitReason)
          : null;
      set({
        state: "confirming",
        currentStudent: person,
        currentCampusStatus:
          campusStatus === "IN" || campusStatus === "OUT" ? campusStatus : null,
        lastOutReason,
        selectedDirection: direction,
        selectedReason: null,
        entryType: normalizeEntryType(
          person.studentDetails?.currentEntryType ?? person.currentEntryType
        ),
        photoVerificationDone: false,
        error: null,
      });
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }
      console.error("Network or fetch error during scan start:", err);
      if (get()._scanGeneration !== gen) return;
      set({
        state: "error",
        error: {
          message: err instanceof Error ? err.message : "Unable to communicate with server.",
          code: "NETWORK_ERROR",
          retryable: true,
        },
        currentStudent: null,
      });
    }
  },

  setDirection: (direction: ScanDirection) => {
    const { currentStudent } = get();
    if (!currentStudent) return;
    set({ selectedDirection: direction, selectedReason: null });
  },

  setReason: (reason: ExitReason | null) => {
    set({ selectedReason: reason, state: "confirming" });
  },

  setEntryType: (entryType: "hosteller" | "day_scholar" | null) => {
    set({ entryType });
  },

  

  // Clears only the error field, leaving other state intact
  clearError: () => set({ error: null }),

  confirmScan: async (addToast: (toast: Omit<ToastData, "id">) => void, overrideDirection?: ScanDirection, overrideReason?: string, overrideEntryType?: "hosteller" | "day_scholar") => {
    const { currentStudent } = get();
    if (!currentStudent) return;

    const gen = get()._scanGeneration + 1;
    set({ _scanGeneration: gen });
    const directionToUse = overrideDirection || get().selectedDirection;
    const reasonToUse = (overrideReason as ExitReason) || get().selectedReason;
    // Resolve the entry type: explicit override (operator tapped a specific
    // entry/exit button) wins over the stored value; IN scans default to
    // the stored type when the operator did not pick a button.
    const entryTypeToUse: "hosteller" | "day_scholar" | null =
      overrideEntryType ?? get().entryType ??
      normalizeEntryType(
        currentStudent.studentDetails?.currentEntryType ?? currentStudent.currentEntryType
      ) ??
      (directionToUse === "IN" ? "hosteller" : null);
    const clientEventId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // Offline path: capture locally; the queue hook replays it when the network returns.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      playAudioFeedback("warning");
      addScan({
        clientEventId,
        roll: currentStudent.uniqueId || currentStudent.roll || "",
        direction: directionToUse,
        reason: reasonToUse ?? (directionToUse === "OUT" ? "daily_outing" : undefined),
        gateId: get().gate?.id || get().gateId || "",
        queuedAt: Date.now(),
        status: "queued",
        entryType: entryTypeToUse ?? undefined,
      });
      addToast({
        variant: "warning",
        title: "Scan Queued Offline",
        message: "No network — this scan was saved locally and will sync automatically when the connection returns.",
      });
      set({
        error: {
          message: "Scan queued locally — will sync when the network returns.",
          code: "QUEUED_OFFLINE",
          retryable: false,
          queued: true,
        },
        entryType: entryTypeToUse,
      });
      return;
    }
    const uniqueId = currentStudent.uniqueId || currentStudent.roll || "";
    const authState = useAuthStore.getState();
    const operatorId = authState.user?.id || "op-1";
    const resolvedGateId = get().gate?.id || get().gateId || authState.user?.gateId || "";
    if (!resolvedGateId) {
      playAudioFeedback("error");
      addToast({
        variant: "error",
        title: "No Gate Assigned",
        message: "This operator account has no gate assignment. Ask your supervisor or sysadmin to assign a gate, then sign in at that gate's kiosk.",
      });
      set({
        error: {
          message: "No gate assigned to this operator. A gate must be assigned before scans can be recorded.",
          code: "NO_GATE_ASSIGNED",
        },
      });
      return;
    }

    // Async execution with GPS geolocation & sysTag telemetry, 15s fetch timeout
    return (async () => {
      const geo = await getClientLocation();
      const sysTag = getClientSysTag();
      const authStore = useAuthStore.getState();
      const token = authStore.token;
      const sessionToken = authStore.user?.currentSessionToken;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (sessionToken) headers["X-Session-Token"] = sessionToken;

      try {
        // IN scans: persist the entry-type selection first (POST
        // /api/operator/entry-type) so the later OUT-scan scope check reads
        // the freshly stored type, then record the movement. The entry-type
        // write is non-fatal by design — a failure here never blocks the scan.
        if (directionToUse === "IN" && entryTypeToUse) {
          await fetchWithTimeout("/api/operator/entry-type", {
            method: "POST",
            headers,
            body: JSON.stringify({
              roll: uniqueId,
              entryType: entryTypeToUse,
              gateId: resolvedGateId,
            }),
          }, 10_000).catch(() => { /* non-fatal: proceed to record the scan */ });
        }
        const res = await fetchWithTimeout("/api/gate/scan", {
          method: "POST",
          headers,
          body: JSON.stringify({ clientEventId, roll: uniqueId,
            direction: directionToUse,
            reason: reasonToUse || (directionToUse === "OUT" ? "daily_outing" : undefined),
            entryType: entryTypeToUse ?? undefined,
            gateId: resolvedGateId,
            operatorId,
            isManual: false,
            sysTag,
            geo,
          }),
        }, 15_000);
        return res;
      } catch (e: any) {
        if (e?.name === "AbortError") {
          throw new Error("Scan request timed out (15s). Network connection may be slow.");
        }
        throw e;
      }
    })()
      .then(async (res) => {
        const result = await res.json().catch(() => null);
        if (res.status === 409) {
          playAudioFeedback("warning");
          addToast({
            variant: "error",
            title: "Duplicate Scan",
            message: `Duplicate scan detected. Same student scanned recently.`,
          });
          set({ state: "error", error: { message: "Duplicate scan detected", code: "DUPLICATE", retryable: true } });
          return null;
        }
        // Handle session expiry — log out and redirect to login
        if (res.status === 401 || result?.error?.code === "SESSION_EXPIRED" || result?.error?.code === "UNAUTHORIZED") {
          const authStore = useAuthStore.getState();
          authStore.logout();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return null;
        }
        return result;
      })
      .then((result) => {
        if (get()._scanGeneration !== gen) return;
        if (!result) return;

        // /api/gate/scan success shape: { data: { scan, isDuplicate, person } }
        // Failure shapes: { error, message } (fail()) or { success:false, error:{code,message} } (auth).
        const payload = result.data;

        // A duplicate means the movement is ALREADY on record (the server
        // returned the pre-existing row and did not insert a new one). We
        // show the "already scanned" time and cancel this operation instead
        // of recording a second movement.
        if (payload?.isDuplicate) {
          playAudioFeedback("warning");
          const dupScan: any = payload.scan;
          const scannedAt =
            (dupScan?.timestamp && new Date(dupScan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })) ||
            "just now";
          addToast({
            variant: "warning",
            title: "Already Scanned",
            message: `${currentStudent.name} was already scanned ${directionToUse === "OUT" ? "out" : "in"} at ${scannedAt}. This scan was not recorded.`,
          });
          // Cancel the operation: do not count as a new movement, do not push
          // into recentScans (it's the same row), just surface the existing
          // record so the operator can see the time.
          set({
            state: "success",
            lastScan: dupScan ?? get().lastScan,
            error: null,
            entryType: entryTypeToUse,
          });
          return;
        }

        // Any top-level error (fail() / auth layer) → error state
        if (result.error || result.success === false) {
          const msg = result.error?.message || result.message || result.error?.code || "Scan failed";
          playAudioFeedback("error");
          set({
            state: "error",
            currentStudent: null,
            error: { message: msg, code: result.error?.code || "ERROR", retryable: true },
          });
          addToast({ variant: "error", title: "Scan Failed", message: msg });
          return;
        }

        // Success: a valid { data } payload means the movement was recorded
        if (payload === undefined) {
          playAudioFeedback("error");
          set({
            state: "error",
            currentStudent: null,
            error: { message: "Scan failed — no data returned.", code: "UNKNOWN", retryable: true },
          });
          return;
        }

        playAudioFeedback("success");
        addToast({
          variant: "success",
          title: "Scan Recorded",
          message: `${currentStudent.name} (${currentStudent.roll}) has been successfully scanned ${directionToUse === "IN" ? "in" : "out"}.`,
        });

        const prev = get().todaysStats;
        const newStats = prev
          ? {
              entries: directionToUse === "IN" ? prev.entries + 1 : prev.entries,
              exits: directionToUse === "OUT" ? prev.exits + 1 : prev.exits,
              onCampus: directionToUse === "IN" ? prev.onCampus + 1 : prev.onCampus - 1,
            }
          : null;

        const scan = payload.scan ?? null;
        set({
          state: "success",
          lastScan: scan,
          todaysStats: newStats,
          recentScans: scan ? [scan, ...get().recentScans.slice(0, 4)] : get().recentScans,
          error: null,
          entryType: entryTypeToUse,
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred during scan confirmation.";
        const isTimeout = err instanceof Error && err.message.includes("timed out");
        const isNetwork = isTimeout || err instanceof Error && (err.name === "TypeError" || err.name === "NetworkError");
        // A failed request must not lose the scan: capture it locally and replay on reconnect.
        addScan({
          clientEventId,
          roll: uniqueId,
          direction: directionToUse,
          reason: reasonToUse ?? (directionToUse === "OUT" ? "daily_outing" : undefined),
          gateId: resolvedGateId,
          queuedAt: Date.now(),
          status: "queued",
          entryType: entryTypeToUse ?? undefined,
        });
        playAudioFeedback(isNetwork ? "warning" : "error");
        addToast({
          variant: isNetwork ? "warning" : "error",
          title: isNetwork ? "Scan Queued" : "Scan Failed",
          message: isNetwork
            ? "Scan could not be delivered — saved locally and will sync when the network returns."
            : msg,
        });
        set({
          state: "error",
          error: isNetwork
            ? {
                message: "Scan queued locally — will sync when the network returns.",
                code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
                retryable: false,
                queued: true,
              }
            : {
                message: msg,
                code: "UNKNOWN",
                retryable: false,
              },
        });
      });
  },

    cancelScan: () => {
    set({
      _scanGeneration: get()._scanGeneration + 1,
      state: "idle",
      currentStudent: null,
      currentCampusStatus: null,
      lastOutReason: null,
      selectedDirection: "IN",
      selectedReason: null,
      entryType: null,
      photoVerificationDone: false,
      error: null,
    });
  },

  // Fetch today's stats. Prefer the server route /api/operator/stats (server
  // runs with the service client, which the browser's anon client cannot use
  // due to RLS); fall back to the local statsToday() if the request fails.
  _fetchTodayStats: async (): Promise<TodayStatsResult> => {
    const serverStats = await fetchTodayStats(get().gateId || undefined);
    if (serverStats) return serverStats;
    return {
      entries: 0,
      exits: 0,
      onCampus: 0,
      recentScans: [],
      breakdown: EMPTY_BREAKDOWN,
      outing: [],
    };
  },

  reset: async () => {
    const stats = await get()._fetchTodayStats();
    set({
      _scanGeneration: get()._scanGeneration + 1,
      state: "idle",
      currentStudent: null,
      currentCampusStatus: null,
      lastOutReason: null,
      selectedDirection: "IN",
      selectedReason: null,
      entryType: null,
      photoVerificationDone: false,
      error: null,
      todaysStats: stats
        ? { entries: stats.entries, exits: stats.exits, onCampus: stats.onCampus }
        : null,
      recentScans: stats?.recentScans ?? [],
      breakdown: stats?.breakdown ?? null,
      outing: stats?.outing ?? [],
    });
  },

  loadStats: async () => {
    const stats = await get()._fetchTodayStats();
    if (stats) {
      set({
        todaysStats: { entries: stats.entries, exits: stats.exits, onCampus: stats.onCampus },
        recentScans: stats.recentScans,
        breakdown: stats.breakdown,
        outing: stats.outing || [],
      });
    }
  },

  setGate: async (gateId: string) => {
    if (!gateId) {
      set({ gate: null, gateId: null });
      return;
    }
    const user = useAuthStore.getState().user;
    if (user?.role === "operator" && user.gateId && user.gateId !== gateId) {
      useUIStore.getState().addToast({
        variant: "error",
        title: "Gate Restricted",
        message: "You are not assigned to this gate.",
      });
      set({
        gate: { id: user.gateId, name: user.gateId, location: "Assigned Gate", type: "ENTRY_EXIT" as const, isActive: true },
        gateId: user.gateId,
      });
      return;
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gateId);
    const normalizedGateId = !isUuid && /^\d+$/.test(gateId) ? `gate-${gateId}` : gateId;
    set({
      gate: { id: normalizedGateId, name: normalizedGateId, location: "Main Gate", type: "ENTRY_EXIT" as const, isActive: true },
      gateId: normalizedGateId,
    });
  },
}));
