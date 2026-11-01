"use client";

import { useMemo } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoading } from "@/components/shared/LoadingStates";

interface CalendarPayload {
  data: {
    days: Array<{ date: string; status: string | null }>;
    summary: { present: number; absent: number; unmarked: number; total: number };
  };
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Overall attendance for the current month. Per-subject breakdown is
// deferred: attendance_records has no subject_code (decision: ship
// overall only).
export default function AttendancePage() {
  const month = useMemo(currentMonth, []);
  const { data, loading } = useApiResource<CalendarPayload>(
    `/api/student/attendance-calendar?month=${month}`,
    { ttlMs: 60_000 },
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }
  const s = data?.data?.summary;
  const pct = s && s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
  const tone =
    pct >= 75
      ? "action-success"
      : pct >= 60
        ? "alert-warning"
        : "alert-critical";

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        Attendance
      </h1>
      <div
        className={`rounded-2xl border-2 border-[var(--${tone})] p-6 text-center`}
      >
        <p className="text-5xl font-bold text-[var(--text-primary)]">{pct}%</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {s
            ? `${s.present} present · ${s.absent} absent · ${s.total} total days`
            : "No data this month"}
        </p>
      </div>
      {pct < 75 && s && s.total > 0 && (
        <p className="rounded-xl border border-[var(--alert-warning)] bg-[var(--alert-warning)]/10 p-3 text-sm text-[var(--alert-warning)]">
          You are below 75%. Attend consistently to avoid detention.
        </p>
      )}
    </div>
  );
}
