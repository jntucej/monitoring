import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PrincipalWin {
  ticket: string;
  outcome: "APPROVED" | "REJECTED" | "ESCALATED" | "DELEGATED" | "OVERRIDDEN";
  subject: string;
  at: string;
  /** How many people downstream this decision unblocks. */
  unblockedCount: number;
  responseMs: number;
}

export interface PrincipalBests {
  fastestResponseMs: number | null;
  biggestUnblockCount: number;
  mostDecisionsInDay: number;
  longestZeroEscalationStreak: number;
}

interface RetentionState {
  /** Days with zero overdue escalations AND at least one strategic action. */
  authorityStreak: number;
  lastStreakDay: string | null;

  /** Total people unblocked today. */
  unblockedToday: number;
  unblockedTodayDate: string | null;

  /** Personal bests. */
  bests: PrincipalBests;

  /** Session wins (not persisted). */
  sessionWins: PrincipalWin[];
  /** Today's wins (persisted; cleared on date rollover). */
  todayWins: PrincipalWin[];
  todayWinsDate: string | null;
  /** Session decisions count. */
  sessionDecisions: number;

  celebrating: boolean;
}

interface RetentionActions {
  recordWin: (win: PrincipalWin) => void;
  markCelebrated: () => void;
  bumpStreakIfEligible: (zeroOverdue: boolean) => void;
  resetTodayIfNeeded: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const usePrincipalRetention = create<RetentionState & RetentionActions>()(
  persist(
    (set, get) => ({
      authorityStreak: 0,
      lastStreakDay: null,
      unblockedToday: 0,
      unblockedTodayDate: null,
      bests: {
        fastestResponseMs: null,
        biggestUnblockCount: 0,
        mostDecisionsInDay: 0,
        longestZeroEscalationStreak: 0,
      },
      sessionWins: [],
      todayWins: [],
      todayWinsDate: null,
      sessionDecisions: 0,
      celebrating: false,

      recordWin: (win) => {
        const state = get();
        const d = today();

        const todayWins =
          state.todayWinsDate === d ? [...state.todayWins, win] : [win];
        const sessionWins = [...state.sessionWins, win];
        const sessionDecisions = state.sessionDecisions + 1;

        const unblockedToday =
          state.unblockedTodayDate === d
            ? state.unblockedToday + win.unblockedCount
            : win.unblockedCount;

        const bests = { ...state.bests };
        if (
          bests.fastestResponseMs === null ||
          win.responseMs < bests.fastestResponseMs
        ) {
          bests.fastestResponseMs = win.responseMs;
        }
        if (win.unblockedCount > bests.biggestUnblockCount) {
          bests.biggestUnblockCount = win.unblockedCount;
        }
        if (sessionDecisions > bests.mostDecisionsInDay) {
          bests.mostDecisionsInDay = sessionDecisions;
        }

        set({
          todayWins,
          todayWinsDate: d,
          sessionWins,
          sessionDecisions,
          unblockedToday,
          unblockedTodayDate: d,
          bests,
        });
      },

      markCelebrated: () => set({ celebrating: false }),

      bumpStreakIfEligible: (zeroOverdue) => {
        const state = get();
        const d = today();
        if (state.lastStreakDay === d) return;

        // Weekends don't count — Principal acts on workdays
        const day = new Date().getDay();
        if (day === 0 || day === 6) return;

        if (zeroOverdue && state.sessionDecisions > 0) {
          const next = state.authorityStreak + 1;
          set({
            authorityStreak: next,
            lastStreakDay: d,
            bests: {
              ...state.bests,
              longestZeroEscalationStreak: Math.max(
                state.bests.longestZeroEscalationStreak,
                next
              ),
            },
          });
        } else if (!zeroOverdue) {
          set({ authorityStreak: 0, lastStreakDay: d });
        }
      },

      resetTodayIfNeeded: () => {
        const d = today();
        const state = get();
        if (state.todayWinsDate !== null && state.todayWinsDate !== d) {
          set({
            todayWins: [],
            todayWinsDate: d,
            unblockedToday: 0,
            unblockedTodayDate: d,
          });
        }
      },
    }),
    {
      name: "principal-retention",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        authorityStreak: s.authorityStreak,
        lastStreakDay: s.lastStreakDay,
        unblockedToday: s.unblockedToday,
        unblockedTodayDate: s.unblockedTodayDate,
        bests: s.bests,
        todayWins: s.todayWins,
        todayWinsDate: s.todayWinsDate,
      }),
    }
  )
);
