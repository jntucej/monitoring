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
  confirmScan: (overrideDirection?: ScanDirection, overrideReason?: ExitReason | string) => void;
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

  startScan: async (roll) => {
    const cleanRoll = roll.trim().toUpperCase();
    let student = await findStudentByRoll(cleanRoll);

    // Dynamic fallback profile creation if roll is not pre-registered in DB seed
    if (!student) {
      student = {
        id: `stu-${cleanRoll.toLowerCase()}`,
        roll: cleanRoll,
        name: `Student (${cleanRoll})`,
        department: "CSE",
        year: 3,
        section: "A",
        batch: "2022-2026",
        photo: "/avatar-placeholder.png",
        email: `${cleanRoll.toLowerCase()}@jntuhcej.ac.in`,
        phone: "+91 9876543210",
        parentId: "parent-1",
        parentName: "Parent",
        parentPhone: "+91 9876543211",
        qrCode: cleanRoll,
        idValidUntil: "2028-12-31",
        status: "ACTIVE",
      } as Student;
    }

    const direction = await inferDirection(cleanRoll);
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

  confirmScan: async (overrideDirection?: ScanDirection, overrideReason?: ExitReason | string) => {
    const { currentStudent } = get();
    if (!currentStudent) return;

    const directionToUse = overrideDirection || get().selectedDirection;
    const reasonToUse = (overrideReason as ExitReason) || get().selectedReason;

    const isDuplicateScan = await isDuplicate(currentStudent.roll, directionToUse);
    if (isDuplicateScan) {
      set({
        state: "error",
        error: {
          code: "DUPLICATE_SCAN",
          message: `This student was already scanned ${directionToUse === "OUT" ? "out" : "in"} recently. Please wait 5 minutes.`,
        },
      });
      setTimeout(() => get().reset(), 3000);
      return;
    }

    const result = await addScan({
      roll: currentStudent.roll,
      direction: directionToUse,
      reason: reasonToUse ? (reasonToUse as ExitReason) : (directionToUse === "OUT" ? "Regular" : undefined),
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
    const stats = await statsToday();
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
    // Convert numeric gate IDs to proper format (1 -> gate-1, 2 -> gate-2, etc.)
    // Skip lookup for invalid gate IDs (e.g., "manual", "scan", etc.)
    const normalizedGateId = /^\d+$/.test(gateId) ? `gate-${gateId}` : gateId;
    
    // Only query database if gateId looks like a valid gate ID
    if (!normalizedGateId.startsWith('gate-') && !/^\d+$/.test(gateId)) {
      // Invalid gate ID format, use fallback
      set({ gate: null });
      return;
    }
    
    const gate = await findGateById(normalizedGateId);
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
