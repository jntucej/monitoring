"use client";

import { Flame, GraduationCap, Users } from "lucide-react";
import { useHodRetention } from "@/stores/hodRetentionStore";

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const teaching = useHodRetention((s) => s.teachingStreak);
  const faculty = useHodRetention((s) => s.facultyStreak);

  if (compact) {
    if (teaching === 0 && faculty === 0) return null;
    return (
      <div className="flex gap-1">
        {teaching > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-[var(--action-info)]/10 px-1.5 py-0.5 text-[10px] text-[var(--action-info)]">
            <GraduationCap className="size-2.5" />
            {teaching}
          </span>
        )}
        {faculty > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-[var(--action-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--action-primary)]">
            <Users className="size-2.5" />
            {faculty}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {teaching > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--action-info)]/30 bg-[var(--action-info)]/10 px-2.5 py-1 text-xs text-[var(--action-info)]"
          title="Consecutive workdays where you marked attendance for all classes"
        >
          <GraduationCap className="size-3" />
          <span className="font-semibold tabular-nums">{teaching}</span>
          <span>teaching day{teaching === 1 ? "" : "s"}</span>
        </div>
      )}
      {faculty > 0 && (
        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--action-primary)]/30 bg-[var(--action-primary)]/10 px-2.5 py-1 text-xs text-[var(--action-primary)]"
          title="Consecutive workdays with zero faculty attendance escalations"
        >
          <Flame className="size-3" />
          <span className="font-semibold tabular-nums">{faculty}</span>
          <span>faculty day{faculty === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
}
