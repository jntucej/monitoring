import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface HodWin {
  ticket: string;
  outcome: "APPROVED" | "REJECTED" | "ESCALATED";
  subject: string;
  at: string;
  responseMs: number;
  /** Number of students this approval impacted. */
  impactedStudents: number;
}

export interface HodBests {
  fastestApprovalMs: number | null;
  mostApprovalsInSession: number;
  biggestImpact: number;
  longestTeachingStreak: number;
  longestFacultyStreak: number;
  longestApprovalStreak: number;
}

interface RetentionState {
  /** Days where all assigned classes were marked present. */
  teachingStreak: number;
  lastTeachingDay: string | null;

  /** Days with zero faculty attendance escalations unresolved. */
  facultyStreak: number;
  lastFacultyDay: string | null;

  /** Days with zero pending approvals by end of day. */
  approvalStreak: number;
  lastApprovalDay: string | null;

  /** Students impacted this week (rolling). */
  studentsImpactedThisWeek: number;
  studentsImpactedDate: string | null;

  bests: HodBests;

  sessionWins: HodWin[];
  todayWins: HodWin[];
  todayWinsDate: string | null;
  sessionDecisions: number;
  celebrating: boolean;
}

interface RetentionActions {
  recordWin: (win: HodWin) => void;
  markCelebrated: () => void;
  bumpTeachingStreak: (allClassesMarked: boolean) => void;
  bumpFacultyStreak: (zeroEscalations: boolean) => void;
  bumpApprovalStreak: (zeroPending: boolean) => void;
  resetTodayIfNeeded: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const isWorkday = () => {
  const d = new Date().getDay();
  return d !== 0 && d !== 6;
};

export const useHodRetention = create<RetentionState & RetentionActions>()(
  persist(
    (set, get) => ({
      teachingStreak: 0,
      lastTeachingDay: null,
      facultyStreak: 0,
      lastFacultyDay: null,
      approvalStreak: 0,
      lastApprovalDay: null,
      studentsImpactedThisWeek: 0,
      studentsImpactedDate: null,
      bests: {
        fastestApprovalMs: null,
        mostApprovalsInSession: 0,
        biggestImpact: 0,
        longestTeachingStreak: 0,
        longestFacultyStreak: 0,
        longestApprovalStreak: 0,
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

        const bests = { ...state.bests };
        if (
          bests.fastestApprovalMs === null ||
          win.responseMs < bests.fastestApprovalMs
        ) {
          bests.fastestApprovalMs = win.responseMs;
        }
        if (sessionDecisions > bests.mostApprovalsInSession) {
          bests.mostApprovalsInSession = sessionDecisions;
        }
        if (win.impactedStudents > bests.biggestImpact) {
          bests.biggestImpact = win.impactedStudents;
        }

        set({
          todayWins,
          todayWinsDate: d,
          sessionWins,
          sessionDecisions,
          bests,
        });
      },

      markCelebrated: () => set({ celebrating: false }),

      bumpTeachingStreak: (allClassesMarked) => {
        if (!isWorkday()) return;
        const state = get();
        const d = today();
        if (state.lastTeachingDay === d) return;

        if (allClassesMarked) {
          const next = state.teachingStreak + 1;
          set({
            teachingStreak: next,
            lastTeachingDay: d,
            bests: {
              ...state.bests,
              longestTeachingStreak: Math.max(
                state.bests.longestTeachingStreak,
                next
              ),
            },
          });
        }
      },

      bumpFacultyStreak: (zeroEscalations) => {
        if (!isWorkday()) return;
        const state = get();
        const d = today();
        if (state.lastFacultyDay === d) return;

        if (zeroEscalations) {
          const next = state.facultyStreak + 1;
          set({
            facultyStreak: next,
            lastFacultyDay: d,
            bests: {
              ...state.bests,
              longestFacultyStreak: Math.max(
                state.bests.longestFacultyStreak,
                next
              ),
            },
          });
        } else {
          set({ facultyStreak: 0, lastFacultyDay: d });
        }
      },

      bumpApprovalStreak: (zeroPending) => {
        if (!isWorkday()) return;
        const state = get();
        const d = today();
        if (state.lastApprovalDay === d) return;

        if (zeroPending && state.sessionDecisions > 0) {
          const next = state.approvalStreak + 1;
          set({
            approvalStreak: next,
            lastApprovalDay: d,
            bests: {
              ...state.bests,
              longestApprovalStreak: Math.max(
                state.bests.longestApprovalStreak,
                next
              ),
            },
          });
        } else if (!zeroPending) {
          set({ approvalStreak: 0, lastApprovalDay: d });
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
      name: "hod-retention",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        teachingStreak: s.teachingStreak,
        lastTeachingDay: s.lastTeachingDay,
        facultyStreak: s.facultyStreak,
        lastFacultyDay: s.lastFacultyDay,
        approvalStreak: s.approvalStreak,
        lastApprovalDay: s.lastApprovalDay,
        studentsImpactedThisWeek: s.studentsImpactedThisWeek,
        studentsImpactedDate: s.studentsImpactedDate,
        bests: s.bests,
        todayWins: s.todayWins,
        todayWinsDate: s.todayWinsDate,
      }),
    }
  )
);
