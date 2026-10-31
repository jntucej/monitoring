"use client";

import { useEffect } from "react";
import { useHodRetention } from "@/stores/hodRetentionStore";

export function useHodStreak(input: {
  allClassesMarked: boolean;
  zeroFacultyEscalations: boolean;
  zeroPendingApprovals: boolean;
}) {
  const bumpTeaching = useHodRetention((s) => s.bumpTeachingStreak);
  const bumpFaculty = useHodRetention((s) => s.bumpFacultyStreak);
  const bumpApproval = useHodRetention((s) => s.bumpApprovalStreak);
  const resetToday = useHodRetention((s) => s.resetTodayIfNeeded);

  useEffect(() => {
    resetToday();
    bumpTeaching(input.allClassesMarked);
    bumpFaculty(input.zeroFacultyEscalations);
    bumpApproval(input.zeroPendingApprovals);

    const id = setInterval(() => {
      resetToday();
      bumpTeaching(input.allClassesMarked);
      bumpFaculty(input.zeroFacultyEscalations);
      bumpApproval(input.zeroPendingApprovals);
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, [
    input.allClassesMarked,
    input.zeroFacultyEscalations,
    input.zeroPendingApprovals,
    bumpTeaching,
    bumpFaculty,
    bumpApproval,
    resetToday,
  ]);
}
