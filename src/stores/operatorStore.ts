/**
 * Zustand store for the Gate Operator screen state.
 * Manages scan flow: detecting → confirming → reason selection → success.
 */
import { create } from "zustand";
import { inferDirection, findStudentByRoll, addScan, isDuplicate, statsToday, findGateById } from "@/lib/db";
import type { Scan, Student, Gate, ScanDirection, ExitReason } from "@/lib/types";

type ScanState = "idle" | "detecting" | "confirming" | "selecting_reason" | "success" | "error";

interface OperatorState {
  // Current scan flow
  state: ScanState;
  currentStudent: Student | null;
  selectedDirection: ScanDirection;
  selectedReason: ExitReason | null;
  photoVerificationDone: boolean;

  // Data
  lastScan: Scan | null;
  todaysStats: { entries: number; exits: number; onCampus: number } | null;
  recentScans: Scan[];
  gate: Gate | null;

  // Errors
  error: { code: string; message: string } | null;

  // Offline queue
  offlineQueue: Array<{ id: string; roll: string; direction: ScanDirection; reason?: ExitReason }>;
  isOnline: boolean;

  // Actions
  startScan: (roll: string) => void;
  setDirection: (direction: ScanDirection) => void;
  setReason: (reason: ExitReason) => void;
  confirmScan: () => void;
  cancelScan: () => void;
  reset: () => void;
  loadStats: () => void;
  setGate: (gateId: string) => void;
  flushOfflineQueue: () => void;
  setOnline: (online: boolean) => void;
}

export const useOperatorStore = create<OperatorState>()((set, get) => ({
  state: "idle",
  currentStudent: null,
  selectedDirection: "IN",
  selectedReason: null,
  photoVerificationDone: false,

  lastScan: null,
  todaysStats: null,
  recentScans: [],
  gate: null,

  error: null,

  offlineQueue: [],
  isOnline: true,

  startScan: (roll) => {
    const student = findStudentByRoll(roll);
    if (!student) {
      set({
        state: "error",
        error: { code: "INVALID_QR", message: "Invalid QR code. Please contact administration." },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    // Check ID expiry
    if (student.idValidUntil && new Date(student.idValidUntil) < new Date()) {
      set({
        state: "error",
        error: { code: "EXPIRED_ID", message: "Student ID card has expired. Please renew at the administration office." },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    const direction = inferDirection(roll);
    set({
      state: "confirming",
      currentStudent: student,
      selectedDirection: direction,
      selectedReason: null,
      photoVerificationDone: false,
      error: null,
    });
  },

  setDirection: (direction) => {
    const { currentStudent } = get();
    if (!currentStudent) return;
    set({ selectedDirection: direction, selectedReason: null });
  },

  setReason: (reason) => {
    set({ selectedReason: reason, state: "confirming" });
  },

  confirmScan: () => {
    const { currentStudent, selectedDirection, selectedReason } = get();
    if (!currentStudent) return;

    const isDuplicateScan = isDuplicate(currentStudent.roll, selectedDirection);
    if (isDuplicateScan) {
      set({
        state: "error",
        error: {
          code: "DUPLICATE_SCAN",
          message: `This student was already scanned ${selectedDirection === "OUT" ? "out" : "in"} recently. Please wait 5 minutes.`,
        },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    const result = addScan({
      roll: currentStudent.roll,
      direction: selectedDirection,
      reason: selectedDirection === "OUT" ? (selectedReason ?? "Regular") : undefined,
      gateId: get().gate?.id || "gate-1",
      operatorId: "op-1",
      isManual: false,
    });

    if (result.duplicate) {
      set({
        state: "error",
        error: { code: "DUPLICATE_SCAN", message: "This student was already scanned recently. Please wait 5 minutes." },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    // Update stats
    const stats = statsToday();
    set({
      state: "success",
      lastScan: result.scan,
      todaysStats: stats,
      recentScans: stats.recentScans,
      currentStudent: null,
      selectedReason: null,
      photoVerificationDone: false,
    });

    setTimeout(() => get().reset(), 1000);
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

  reset: () => {
    const stats = statsToday();
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

  loadStats: () => {
    const stats = statsToday();
    set({ todaysStats: stats, recentScans: stats.recentScans });
  },

  setGate: (gateId) => {
    const gate = findGateById(gateId);
    set({ gate: gate ?? null });
  },

  flushOfflineQueue: () => {
    const { offlineQueue } = get();
    if (offlineQueue.length === 0) return;
    const scans = offlineQueue.map((s) => ({
      id: s.id,
      roll: s.roll,
      direction: s.direction,
      reason: s.reason,
      gateId: get().gate?.id || "gate-1",
      operatorId: "op-1",
    }));
    set({ offlineQueue: [] });
  },

  setOnline: (online) => set({ isOnline: online }),
}));
