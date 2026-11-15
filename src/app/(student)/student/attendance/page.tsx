"use client";

import { useMemo } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { Skeleton } from "@/components/ui/skeleton";


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
  const month = useMemo(() => currentMonth(), []);
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
      <h1 className="text-lg font-semibold text-text-primary">
        Attendance
      </h1>
      <div
        className={`rounded-2xl border-2 border-[var(--${tone})] p-6 text-center`}
      >
        <p className="text-5xl font-bold text-text-primary">{pct}%</p>
        <p className="mt-1 text-sm text-text-secondary">
          {s
            ? `${s.present} present · ${s.absent} absent · ${s.total} total days`
            : "No data this month"}
        </p>
      </div>
      {pct < 75 && s && s.total > 0 && (
        <p className="surface-card bg-alert-warning/10 p-3 text-sm text-alert-warning">
          You are below 75%. Attend consistently to avoid detention.
        </p>
      )}
      {/* The panel's pain: "attendance page lacks a daily breakdown." The
          calendar payload already carries per-day status — render it so a
          student can see which days were present/absent/unmarked. */}
      {data?.data?.days && data.data.days.length > 0 && (
        <div className="surface-card rounded-xl p-4">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">
            This month, day by day
          </h2>
          <ul className="grid grid-cols-1 gap-1.5" role="list">
            {data.data.days.map((d) => {
              const label = new Date(d.date + "T00:00:00").toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" }
              );
              // The API returns "PRESENT"/"IN"/"present" for present and
              // "ABSENT"/"OUT"/"absent" for absent (see attendance-calendar
              // route). Normalize to a single label + tone.
              const raw = (d.status ?? "").toUpperCase();
              let status: string;
              let cls: string;
              if (["PRESENT", "IN"].includes(raw)) {
                status = "present";
                cls = "text-action-success";
              } else if (["ABSENT", "OUT"].includes(raw)) {
                status = "absent";
                cls = "text-alert-critical";
              } else {
                status = "unmarked";
                cls = "text-text-muted";
              }
              return (
                <li key={d.date} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className={`font-medium ${cls}`}>{status}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
