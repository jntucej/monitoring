import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface SupervisorWin {
  ticket: string;
  kind: "escalation_cleared" | "incident_resolved" | "exception_reviewed";
  subject: string;
  at: string;
  responseMs: number;
}

export interface SupervisorBests {
  fastestResponseMs: number | null;
  mostEscalationsInShift: number;
  longestZeroIncidentShiftStreak: number;
}

interface RetentionState {
  /** Current shift ID (from shift start). Resets all shift-scoped state when it changes. */
  currentShiftId: string | null;
  shiftStartedAt: string | null;
  /** Timestamp when the shift is expected to end (may be known from roster). */
  shiftEndsAt: string | null;

  /** Shifts with zero gate downtime AND zero unresolved incidents at handover. */
  cleanShiftStreak: number;
  lastCompletedShiftId: string | null;

  /** Consecutive handovers submitted on time. */
  handoverStreak: number;
  lastHandoverShiftId: string | null;

  bests: SupervisorBests;

  sessionWins: SupervisorWin[];
  shiftWins: SupervisorWin[];
  sessionDecisions: number;
  celebrating: boolean;
}

interface RetentionActions {
  recordWin: (win: SupervisorWin) => void;
  markCelebrated: () => void;
  /** Called when shift boundary is detected; resets shift-scoped state. */
  beginShift: (shiftId: string, startedAt: string, endsAt: string | null) => void;
  /** Called when the supervisor submits a handover. */
  completeHandover: (shiftId: string, wasClean: boolean) => void;
  /** Called when a shift ends and determines whether the clean streak increments. */
  endShift: (shiftId: string, wasClean: boolean) => void;
}

export const useSupervisorRetention = create<RetentionState & RetentionActions>()(
  persist(
    (set, get) => ({
      currentShiftId: null,
      shiftStartedAt: null,
      shiftEndsAt: null,
      cleanShiftStreak: 0,
      lastCompletedShiftId: null,
      handoverStreak: 0,
      lastHandoverShiftId: null,
      bests: {
        fastestResponseMs: null,
        mostEscalationsInShift: 0,
        longestZeroIncidentShiftStreak: 0,
      },
      sessionWins: [],
      shiftWins: [],
      sessionDecisions: 0,
      celebrating: false,

      recordWin: (win) => {
        const state = get();
        const sessionWins = [...state.sessionWins, win];
        const shiftWins = [...state.shiftWins, win];
        const sessionDecisions = state.sessionDecisions + 1;

        const bests = { ...state.bests };
        if (
          bests.fastestResponseMs === null ||
          win.responseMs < bests.fastestResponseMs
        ) {
          bests.fastestResponseMs = win.responseMs;
        }
        if (sessionDecisions > bests.mostEscalationsInShift) {
          bests.mostEscalationsInShift = sessionDecisions;
        }

        set({ sessionWins, shiftWins, sessionDecisions, bests });
      },

      markCelebrated: () => set({ celebrating: false }),

      beginShift: (shiftId, startedAt, endsAt) => {
        const state = get();
        if (state.currentShiftId === shiftId) return;
        // New shift: wipe shift-scoped state, keep persisted streaks
        set({
          currentShiftId: shiftId,
          shiftStartedAt: startedAt,
          shiftEndsAt: endsAt,
          sessionWins: [],
          shiftWins: [],
          sessionDecisions: 0,
          celebrating: false,
        });
      },

      completeHandover: (shiftId, wasClean) => {
        const state = get();
        if (state.lastHandoverShiftId === shiftId) return;
        set({
          handoverStreak: wasClean ? state.handoverStreak + 1 : 0,
          lastHandoverShiftId: shiftId,
        });
      },

      endShift: (shiftId, wasClean) => {
        const state = get();
        if (state.lastCompletedShiftId === shiftId) return;
        if (wasClean) {
          const next = state.cleanShiftStreak + 1;
          set({
            cleanShiftStreak: next,
            lastCompletedShiftId: shiftId,
            bests: {
              ...state.bests,
              longestZeroIncidentShiftStreak: Math.max(
                state.bests.longestZeroIncidentShiftStreak,
                next
              ),
            },
          });
        } else {
          set({ cleanShiftStreak: 0, lastCompletedShiftId: shiftId });
        }
      },
    }),
    {
      name: "supervisor-retention",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cleanShiftStreak: s.cleanShiftStreak,
        lastCompletedShiftId: s.lastCompletedShiftId,
        handoverStreak: s.handoverStreak,
        lastHandoverShiftId: s.lastHandoverShiftId,
        bests: s.bests,
        // Shift-scoped state deliberately NOT persisted:
        // a supervisor who reloads mid-shift starts the shift fresh.
      }),
    }
  )
);
