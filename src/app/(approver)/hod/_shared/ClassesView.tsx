"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface ScheduleItem {
  id: string;
  periodNumber?: number;
  subjectName?: string;
  subjectCode?: string;
  roomNumber?: string;
  startTime?: string;
  endTime?: string;
  attendanceMarked?: boolean;
  className?: string;
  year?: number;
  section?: string;
}

interface ScheduleResponse {
  success?: boolean;
  data?: ScheduleItem[] | { schedule?: ScheduleItem[]; items?: ScheduleItem[] };
}

export function ClassesView() {
  const { data, loading } = useApiResource<ScheduleResponse>("/api/hod/schedule", {
    ttlMs: 30_000,
  });

  const raw = data?.data;
  const items: ScheduleItem[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.schedule)
    ? raw.schedule
    : Array.isArray(raw?.items)
    ? raw.items
    : [];

  const markedCount = items.filter((i) => i.attendanceMarked).length;
  const pendingCount = items.length - markedCount;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Class Schedule</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Department timetable, assigned periods, and attendance status
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Scheduled Classes" value={items.length} tone="ok" />
        <KpiCard label="Marked" value={markedCount} tone="ok" />
        <KpiCard
          label="Pending Attendance"
          value={pendingCount}
          tone={pendingCount > 0 ? "warn" : "ok"}
        />
      </div>

      {loading && items.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No classes scheduled"
          description="Schedule records are currently unavailable for today."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {items.map((item, idx) => (
              <li
                key={item.id ?? idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {item.subjectName ?? item.subjectCode ?? "Period " + (item.periodNumber ?? idx + 1)}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {item.className ?? (item.year ? `Y${item.year} - Sec ${item.section ?? "A"}` : "Class")} · Room {item.roomNumber ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.attendanceMarked
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {item.attendanceMarked ? "Marked" : "Pending"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  {item.startTime ? `${item.startTime} - ${item.endTime ?? ""}` : "All day"}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<ScheduleItem>
              columns={[
                {
                  header: "Period",
                  accessor: (r) => (r.periodNumber ? `Period ${r.periodNumber}` : "—"),
                },
                {
                  header: "Subject",
                  accessor: (r) => r.subjectName ?? r.subjectCode ?? "—",
                },
                {
                  header: "Class / Room",
                  accessor: (r) =>
                    `${r.className ?? (r.year ? `Y${r.year} ${r.section ?? ""}` : "—")} (Room ${r.roomNumber ?? "—"})`,
                },
                {
                  header: "Time",
                  accessor: (r) => (r.startTime ? `${r.startTime} – ${r.endTime ?? ""}` : "—"),
                },
                {
                  header: "Attendance",
                  accessor: (r) => (
                    <span
                      className={`text-xs font-semibold ${
                        r.attendanceMarked ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {r.attendanceMarked ? "Marked" : "Pending"}
                    </span>
                  ),
                },
              ]}
              data={items}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
