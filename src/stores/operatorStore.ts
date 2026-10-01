/**
 * Zustand store for the Gate Operator screen state.
 * Manages scan flow: detecting → confirming → reason selection.
 */
import { create } from "zustand";
import { addScan, isDuplicate, statsToday, findGateById } from "@/lib/db";
import { playAudioFeedback } from "@/lib/sound";
import type { Scan, Person, Student, Gate, ScanDirection, ExitReason, CategoryBreakdown, OutingEntry } from "@/lib/types";
import type { ToastData } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { validateRollNumber } from "@/lib/rollNumber";
import { getClientLocation, getClientSysTag } from "@/lib/geo";

/**
 * Fetch today's operator gate stats from the server.
 *
 * The browser's anon Supabase client is blocked by RLS from reading the
 * auth-protected `movement_logs` / `daily_stats` tables, so the page must ask a
 * server route (which runs with the service client) for today's counts.
 * Falls back to the local `statsToday()` only if the request itself fails.
 */
async function fetchTodayStats(gateId?: string): Promise<{
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
    const res = await fetch(url, { headers, cache: "no-store" });
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
}

interface OperatorState {
  // Current scan flow
  state: ScanState;
  currentStudent: Student | null;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  photoVerificationDone: boolean;
  error: ScanError | null;
  /** Thumbprint (biometric) confirmation for the current scan person */
  
  /** True when verification was allowed because the person has no thumbprint on file */
  

  // Data
  lastScan: Scan | null;
  todaysStats: { entries: number; exits: number; onCampus: number } | null;
  recentScans: Scan[];
  /** Inside-campus counts per person category + outing list */
  breakdown: CategoryBreakdown | null;
  outing: OutingEntry[];
  gate: Gate | null;
  gateId: string | null;

  // Actions
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason) => void;
  
  confirmScan: (addToast: (toast: Omit<ToastData, "id">) => void, overrideDirection?: ScanDirection, overrideReason?: ExitReason | string) => void;
    cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
  // Internal: fetch today's stats (server-first, local fallback). Not part
  // of the public UI-facing surface; prefixed with _ by convention.
  _fetchTodayStats: () => Promise<{ entries: number; exits: number; onCampus: number; recentScans: Scan[]; breakdown: CategoryBreakdown | null; outing: OutingEntry[] } | null>;
}

const EMPTY_BREAKDOWN: CategoryBreakdown = {
  hostellers: { inside: 0, inToday: 0, outToday: 0 },
  dayscholars: { inside: 0, inToday: 0, outToday: 0 },
  facultyStaff: { inside: 0, inToday: 0, outToday: 0 },
  authorities: { inside: 0, inToday: 0, outToday: 0 },
  visitors: { inside: 0, inToday: 0, outToday: 0 },
  others: { inside: 0, inToday: 0, outToday: 0 },
};

export const useOperatorStore = create<OperatorState>()((set, get) => ({
  state: "idle",
  currentStudent: null,
  selectedDirection: "IN",
  selectedReason: null,
  photoVerificationDone: false,
  
  
  error: null,

  lastScan: null,
  todaysStats: null,
  recentScans: [],
  breakdown: null,
  outing: [],
  gate: null,
  gateId: null,

  startScan: async (roll) => {
    const cleanRoll = roll.trim().toUpperCase();
    if (!cleanRoll) return;

    set({ state: "detecting", error: null,   });

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
      const res = await fetch(`/api/persons/${encodeURIComponent(cleanRoll)}`, { headers });
      const result = await res.json().catch(() => null);

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

      // Infer direction from last scan returned by the API
      let direction: ScanDirection = "IN";
      if (result.data.lastScan?.direction) {
        direction = result.data.lastScan.direction === "IN" ? "OUT" : "IN";
      }

      set({
        state: "confirming",
        currentStudent: person,
        selectedDirection: direction,
        selectedReason: null,
        photoVerificationDone: false,
        
        
        error: null,
      });
    } catch (err) {
      console.error("Network or fetch error during scan start:", err);
      set({
        state: "error",
        error: {
          message: err instanceof Error ? err.message : "Unable to communicate with server.",
          code: "NETWORK_ERROR",
        },
        currentStudent: null,
      });
    }
  },

  setDirection: (direction) => {
    const { currentStudent } = get();
    if (!currentStudent) return;
    set({ selectedDirection: direction, selectedReason: null });
  },

  setReason: (reason) => {
    set({ selectedReason: reason, state: "confirming" });
  },

  

  // Clears only the error field, leaving other state intact
  clearError: () => set({ error: null }),

  confirmScan: (addToast, overrideDirection, overrideReason) => {
    const { currentStudent } = get();
    if (!currentStudent) return;

    // Strict 100% Online-Only Check
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      playAudioFeedback("error");
      addToast({
        variant: "error",
        title: "Server Connection Required",
        message: "Action blocked: Active live server API connection is strictly required.",
      });
      set({
        error: {
          message: "100% Strict Online Policy: Active server connection required to process scans.",
          code: "OFFLINE_BLOCKED",
        },
      });
      return;
    }

    const directionToUse = overrideDirection || get().selectedDirection;
    const reasonToUse = (overrideReason as ExitReason) || get().selectedReason;
    const uniqueId = currentStudent.uniqueId || currentStudent.roll || "";
    const operatorId = useAuthStore.getState().user?.id || "op-1";

    // Async execution with GPS geolocation & sysTag telemetry with strict 5s timeout
    (async () => {
      const geo = await getClientLocation();
      const sysTag = getClientSysTag();
      const authStore = useAuthStore.getState();
      const token = authStore.token;
      const sessionToken = authStore.user?.currentSessionToken;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (sessionToken) headers["X-Session-Token"] = sessionToken;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch("/api/gate/scan", {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({ clientEventId: crypto.randomUUID(), roll: uniqueId,
            direction: directionToUse,
            reason: reasonToUse || (directionToUse === "OUT" ? "Regular" : undefined),
            gateId: get().gate?.id || get().gateId || useAuthStore.getState().user?.gateId || "gate-1",
            operatorId,
            isManual: false,
            sysTag,
            geo,
          }),
        });
        clearTimeout(timeoutId);
        return res;
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === "AbortError") {
          throw new Error("Scan request timed out (5s). Network connection may be slow.");
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
          set({ state: "error", error: { message: "Duplicate scan detected", code: "DUPLICATE" } });
          return null;
        }

        // Handle session expiry — log out and redirect to login
        if (res.status === 401 && result?.error?.code === "SESSION_EXPIRED") {
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
        if (!result) return;
        if (result?.duplicate) {
          playAudioFeedback("warning");
          addToast({
            variant: "error",
            title: "Duplicate Scan",
            message: `This student was already scanned ${directionToUse === "OUT" ? "out" : "in"} recently.`,
          });
          set({ state: "error", error: { message: "Duplicate scan detected", code: "DUPLICATE" } });
          return;
        }

        if (!result?.success) {
          playAudioFeedback("error");
          throw new Error(result?.error?.message || "Scan failed");
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

        set({
          state: "success",
          lastScan: result.scan ?? null,
          todaysStats: newStats,
          recentScans: result.scan ? [result.scan, ...get().recentScans.slice(0, 4)] : get().recentScans,
          error: null,
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred during scan confirmation.";
        addToast({
          variant: "error",
          title: "Scan Failed",
          message: msg,
        });
        set({ state: "error", error: { message: msg, code: "UNKNOWN" } });
      });
  },

    cancelScan: () => {
    set({
      state: "idle",
      currentStudent: null,
      selectedDirection: "IN",
      selectedReason: null,
      photoVerificationDone: false,
      
      
      error: null,
    });
  },

  // Fetch today's stats. Prefer the server route /api/operator/stats (server
  // runs with the service client, which the browser's anon client cannot use
  // due to RLS); fall back to the local statsToday() if the request fails.
  _fetchTodayStats: async (): Promise<{ entries: number; exits: number; onCampus: number; recentScans: Scan[]; breakdown: CategoryBreakdown | null; outing: OutingEntry[] } | null> => {
    const serverStats = await fetchTodayStats(get().gateId ?? undefined);
    if (serverStats) return serverStats;

    const localStats = await statsToday(get().gateId ?? undefined);
    return {
      entries: localStats.entries,
      exits: localStats.exits,
      onCampus: localStats.onCampus,
      recentScans: localStats.recentScans as Scan[],
      breakdown: EMPTY_BREAKDOWN,
      outing: [],
    };
  },

  reset: async () => {
    const stats = await get()._fetchTodayStats();
    set({
      state: "idle",
      currentStudent: null,
      selectedDirection: "IN",
      selectedReason: null,
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
        outing: stats.outing,
      });
    }
  },

  setGate: async (gateId) => {
    if (!gateId) {
      set({ gate: null, gateId: null });
      return;
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gateId);
    const normalizedGateId = !isUuid && /^\d+$/.test(gateId) ? `gate-${gateId}` : gateId;
    const gate = (await findGateById(normalizedGateId)) || (await findGateById(gateId));
    set({ gate: gate ?? null, gateId: gate?.id ?? normalizedGateId });
  },
}));
