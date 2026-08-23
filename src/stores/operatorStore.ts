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

  // Offline queue
  offlineQueue: Array<{ id: string; roll: string; direction: ScanDirection; reason?: ExitReason }>;
  isOnline: boolean;

  // Actions
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason) => void;
  confirmScan: (addToast: (toast: Omit<ToastData, "id">) => void, overrideDirection?: ScanDirection, overrideReason?: ExitReason | string) => void;
  cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
  flushOfflineQueue: () => Promise<void>;
  setOnline: (online: boolean) => void;
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

  offlineQueue: [],
  isOnline: true,

  startScan: (roll) => {
    set({ state: "detecting" });
    const cleanRoll = roll.trim().toUpperCase();

    // Fetch person via API to leverage server-side service client (bypasses RLS)
    let student: Person | null = null;
    let direction: ScanDirection = "IN";
    try {
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
      fetch(`/api/persons/${encodeURIComponent(cleanRoll)}`, { headers })
        .then((res) => res.ok ? res.json() : Promise.reject(res))
        .then((result) => {
          if (result.success && result.data?.person) {
            student = result.data.person;
            // Infer direction from last scan returned by the API
            if (result.data.lastScan?.direction) {
              direction = result.data.lastScan.direction === "IN" ? "OUT" : "IN";
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching person:", err);
        })
        .finally(() => {
          if (!student) {
            const isFac = cleanRoll.startsWith("FAC");
            const isStf = cleanRoll.startsWith("STF");
            const isWrk = cleanRoll.startsWith("WRK");
            const isVis = cleanRoll.startsWith("VIS");
            const personType = isFac ? "faculty" : isStf ? "staff" : isWrk ? "worker" : isVis ? "visitor" : "student";

            student = {
              id: `per-${cleanRoll.toLowerCase()}`,
              uniqueId: cleanRoll,
              fullName: `${personType.toUpperCase()} (${cleanRoll})`,
              personType,
              department: "CSE",
              roll: cleanRoll,
              name: `${personType.toUpperCase()} (${cleanRoll})`,
              photo: "/avatar-placeholder.png",
              photoUrl: "/avatar-placeholder.png",
              email: `${cleanRoll.toLowerCase()}@gatekeeper.edu`,
              phone: "+91 9876543210",
              qrCode: cleanRoll,
              idValidUntil: "2028-12-31",
              status: "ACTIVE",
            } as Person;
          }

          set({
            state: "confirming",
            currentStudent: student,
            selectedDirection: direction,
            selectedReason: null,
            photoVerificationDone: false,
          });
        });
    } catch (err) {
      console.error("Error fetching person:", err);
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

    // Fire-and-forget: wrap async operations in a promise chain so the UI
    // doesn't block while we check duplicates, write the scan, and update stats.
    Promise.resolve()
      .then(() => isDuplicate(currentStudent.uniqueId || currentStudent.roll || "", directionToUse))
      .then((isDuplicateScan) => {
        if (isDuplicateScan) {
          addToast({
            variant: "error",
            title: "Duplicate Scan",
            message: `This student was already scanned ${directionToUse === "OUT" ? "out" : "in"} recently.`,
          });
          set({ error: { message: "Duplicate scan detected", code: "DUPLICATE" } });
          return null;
        }
        return null;
      })
      .then(() =>
        addScan({
          roll: currentStudent.uniqueId || currentStudent.roll || "",
          direction: directionToUse,
          reason: reasonToUse ? reasonToUse : directionToUse === "OUT" ? "Regular" : undefined,
          gateId: get().gate?.id || "gate-1",
          operatorId: useAuthStore.getState().user?.id || "op-1",
          isManual: false,
        })
      )
      .then((result) => {
        if (result?.duplicate) {
          addToast({
            variant: "error",
            title: "Duplicate Scan",
            message: "This student was already scanned recently.",
          });
          set({ state: "error", error: { message: "Duplicate scan detected", code: "DUPLICATE" } });
          return;
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
          lastScan: result?.scan ?? null,
          todaysStats: newStats,
          recentScans: result?.scan ? [result.scan, ...get().recentScans.slice(0, 4)] : get().recentScans,
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
    const normalizedGateId = /^\d+$/.test(gateId) ? `gate-${gateId}` : gateId;
    if (!normalizedGateId.startsWith('gate-') && !/^\d+$/.test(gateId)) {
      set({ gate: null });
      return;
    }
    const gate = await findGateById(normalizedGateId);
    set({ gate: gate ?? null });
  },

  flushOfflineQueue: async () => {
    const { offlineQueue, gate } = get();
    if (offlineQueue.length === 0) return;

    const { addToast } = useUIStore.getState();

    try {
      const authStore = useAuthStore.getState();
      const token = authStore.token;

      if (!token) {
        console.warn("No auth token available for sync");
        return;
      }

      const response = await fetch("/api/gate/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Session-Token": authStore.user?.currentSessionToken || "",
        },
        body: JSON.stringify({
          scans: offlineQueue.map((scan) => ({
            ...scan,
            gateId: gate?.id || "gate-1",
          })),
        }),
      });

      const result = await response.json();
      if (response.status === 401 && result?.error?.code === "SESSION_EXPIRED") {
        authStore.logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }
      if (result.success) {
        const failedCount =
          result.data?.results?.filter((r: any) => r.status === "error")?.length || 0;
        if (failedCount === 0) {
          addToast({
            title: "Sync Complete",
            message: `All ${offlineQueue.length} offline scans synced successfully.`,
            variant: "success",
          });
        } else {
          addToast({
            title: "Partial Sync",
            message: `${offlineQueue.length - failedCount} of ${offlineQueue.length} scans synced. ${failedCount} failed.`,
            variant: "warning",
          });
          // Keep failed scans in queue
          const results = result.data.results;
          const failedScans = offlineQueue.filter(
            (_, index) => results[index]?.status === "error"
          );
          set({ offlineQueue: failedScans });
          return;
        }
      } else {
        addToast({
          title: "Sync Failed",
          message: "Could not sync offline scans. Please try again later.",
          variant: "error",
        });
        return;
      }

      set({ offlineQueue: [] });
    } catch (error) {
      console.error("Error syncing offline queue:", error);
      addToast({
        title: "Sync Error",
        message: "Network error while syncing scans.",
        variant: "error",
      });
    }
  },

  setOnline: (online) => set({ isOnline: online }),
}));
