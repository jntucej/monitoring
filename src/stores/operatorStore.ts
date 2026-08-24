/**
 * Zustand store for the Gate Operator screen state.
 * Manages scan flow: detecting → confirming → reason selection.
 */
import { create } from "zustand";
import { addScan, isDuplicate, statsToday, findGateById } from "@/lib/db";
import type { Scan, Person, Student, Gate, ScanDirection, ExitReason } from "@/lib/types";
import type { ToastData } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { validateRollNumber } from "@/lib/rollNumber";

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

  // Data
  lastScan: Scan | null;
  todaysStats: { entries: number; exits: number; onCampus: number } | null;
  recentScans: Scan[];
  gate: Gate | null;

  // Actions
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason) => void;
  confirmScan: (addToast: (toast: Omit<ToastData, "id">) => void, overrideDirection?: ScanDirection, overrideReason?: ExitReason | string) => void;
  cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
}

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
  gate: null,

  startScan: async (roll) => {
    const cleanRoll = roll.trim().toUpperCase();
    if (!cleanRoll) return;

    set({ state: "detecting", error: null });

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

    const directionToUse = overrideDirection || get().selectedDirection;
    const reasonToUse = (overrideReason as ExitReason) || get().selectedReason;
    const uniqueId = currentStudent.uniqueId || currentStudent.roll || "";
    const operatorId = useAuthStore.getState().user?.id || "op-1";

    // Fire-and-forget: call server-side API to bypass RLS
    Promise.resolve()
      .then(() => {
        const authStore = useAuthStore.getState();
        const token = authStore.token;
        const sessionToken = authStore.user?.currentSessionToken;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (sessionToken) headers["X-Session-Token"] = sessionToken;

        return fetch("/api/gate/scan", {
          method: "POST",
          headers,
          body: JSON.stringify({
            roll: uniqueId,
            direction: directionToUse,
            reason: reasonToUse || (directionToUse === "OUT" ? "Regular" : undefined),
            gateId: get().gate?.id || "gate-1",
            operatorId,
            isManual: false,
          }),
        });
      })
      .then(async (res) => {
        const result = await res.json();
        // Handle session expiry — log out and redirect to login instead of showing "verification denied"
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
          addToast({
            variant: "error",
            title: "Duplicate Scan",
            message: `This student was already scanned ${directionToUse === "OUT" ? "out" : "in"} recently.`,
          });
          set({ error: { message: "Duplicate scan detected", code: "DUPLICATE" } });
          return;
        }

        if (!result?.success) {
          throw new Error(result?.error?.message || "Scan failed");
        }

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

  reset: async () => {
    const stats = await statsToday();
    set({
      state: "idle",
      currentStudent: null,
      selectedDirection: "IN",
      selectedReason: null,
      photoVerificationDone: false,
      error: null,
      todaysStats: stats,
      recentScans: stats.recentScans,
    });
  },

  loadStats: async () => {
    const stats = await statsToday();
    set({ todaysStats: stats, recentScans: stats.recentScans });
  },

  setGate: async (gateId) => {
    if (!gateId) {
      set({ gate: null });
      return;
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gateId);
    const normalizedGateId = !isUuid && /^\d+$/.test(gateId) ? `gate-${gateId}` : gateId;
    const gate = await findGateById(normalizedGateId);
    set({ gate: gate ?? null });
  },
}));
