import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Win {
  ticket: string;
  outcome: "APPROVED" | "REJECTED" | "ESCALATED" | "FORWARDED";
  subject: string;
  at: string;          // ISO
  responseMs: number;  // time-to-decision
}

export interface PersonalBests {
  fastestResponseMs: number | null;
  mostDecisionsInDay: number;
  longestQuietDayStreak: number;
}

interface RetentionState {
  /** Consecutive work days with at least one decision AND zero overdue items. */
  focusStreak: number;
  /** YYYY-MM-DD of the last day counted toward the streak. */
  lastStreakDay: string | null;
  /** YYYY-MM-DD of the last day the streak broke (for reset logic). */
  lastBreakDay: string | null;

  /** Personal bests — updated on each decision. */
  personalBests: PersonalBests;

  /** Wins captured this session (not persisted across reloads). */
  sessionWins: Win[];

  /** Wins from today (persisted; cleared on date rollover). */
  todayWins: Win[];
  todayWinsDate: string | null;

  /** Session-level decision count. */
  sessionDecisions: number;

  /** Whether the celebrate overlay is visible. */
  celebrating: boolean;
}

interface RetentionActions {
  recordWin: (win: Win) => void;
  markCelebrated: () => void;
  bumpStreakIfEligible: (zeroOverdue: boolean) => void;
  resetTodayIfNeeded: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useVPRetention = create<RetentionState & RetentionActions>()(
  persist(
    (set, get) => ({
      focusStreak: 0,
      lastStreakDay: null,
      lastBreakDay: null,
      personalBests: {
        fastestResponseMs: null,
        mostDecisionsInDay: 0,
        longestQuietDayStreak: 0,
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

        // Update bests
        const bests = { ...state.personalBests };
        if (
          bests.fastestResponseMs === null ||
          win.responseMs < bests.fastestResponseMs
        ) {
          bests.fastestResponseMs = win.responseMs;
        }
        if (sessionDecisions > bests.mostDecisionsInDay) {
          bests.mostDecisionsInDay = sessionDecisions;
        }

        set({
          todayWins,
          todayWinsDate: d,
          sessionWins,
          sessionDecisions,
          personalBests: bests,
        });
      },

      markCelebrated: () => set({ celebrating: false }),

      bumpStreakIfEligible: (zeroOverdue) => {
        const state = get();
        const d = today();
        if (state.lastStreakDay === d) return; // already counted today

        // Only workdays count
        const day = new Date().getDay();
        if (day === 0 || day === 6) return;

        if (zeroOverdue && state.sessionDecisions > 0) {
          const next = state.focusStreak + 1;
          set({
            focusStreak: next,
            lastStreakDay: d,
            personalBests: {
              ...state.personalBests,
              longestQuietDayStreak: Math.max(
                state.personalBests.longestQuietDayStreak,
                next
              ),
            },
          });
        } else if (!zeroOverdue) {
          // Bad day: reset streak
          set({
            focusStreak: 0,
            lastStreakDay: d,
            lastBreakDay: d,
          });
        }
      },

      resetTodayIfNeeded: () => {
        const d = today();
        const state = get();
        if (state.todayWinsDate !== null && state.todayWinsDate !== d) {
          set({ todayWins: [], todayWinsDate: d });
        }
      },
    }),
    {
      name: "vp-retention",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        focusStreak: s.focusStreak,
        lastStreakDay: s.lastStreakDay,
        lastBreakDay: s.lastBreakDay,
        personalBests: s.personalBests,
        todayWins: s.todayWins,
        todayWinsDate: s.todayWinsDate,
      }),
    }
  )
);
