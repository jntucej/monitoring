"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "./KpiCard";
import { ListSkeleton } from "./ListSkeleton";
import { WeekBar } from "./WeekBar";

interface AttendanceRecord {
  id: string;
  fullName: string;
  designation: string;
  status: string;
  firstInTime?: string | null;
  lastOutTime?: string | null;
  punctualityStatus?: string;
  totalHoursToday?: string;
}

interface FacultyAttendanceResponse {
  success: boolean;
  records?: AttendanceRecord[];
  summary?: {
    totalFaculty?: number;
    presentToday?: number;
    absentCount?: number;
    lateArrivals?: number;
  };
}

export function FacultyAttendanceView() {
  const { data, loading } = useApiResource<FacultyAttendanceResponse>("/api/faculty/attendance", {
    ttlMs: 30_000,
  });

  const records = data?.records ?? [];
  const summary = data?.summary;
  const absentCount = summary?.absentCount ?? records.filter((r) => r.status === "ABSENT").length;
  const lateCount =
    summary?.lateArrivals ?? records.filter((r) => r.punctualityStatus === "LATE").length;
  const totalCount = summary?.totalFaculty ?? records.length;

  return (
    <div className="space-y-4">
      <WeekBar />
      <header>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Faculty Attendance</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Today's check-in status, punctuality, and exceptions
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Absent Today" value={absentCount} tone={absentCount > 0 ? "danger" : "ok"} />
        <KpiCard label="Late Arrivals" value={lateCount} tone={lateCount > 0 ? "warn" : "ok"} />
        <KpiCard label="Total Faculty" value={totalCount} tone="neutral" />
      </div>

      {loading && records.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No attendance records"
          description="Attendance data is currently empty or unavailable."
        />
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {records.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.fullName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{r.designation}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.status === "PRESENT" || r.status === "INSIDE"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : r.status === "ABSENT"
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>First in: {r.firstInTime ?? "—"}</span>
                  {r.punctualityStatus === "LATE" && (
                    <span className="text-[var(--action-warning)] font-medium">Late</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable<AttendanceRecord>
              columns={[
                { header: "Name", accessor: (r) => r.fullName },
                { header: "Designation", accessor: (r) => r.designation },
                {
                  header: "Status",
                  accessor: (r) => (
                    <span
                      className={`text-xs font-semibold ${
                        r.status === "PRESENT" || r.status === "INSIDE"
                          ? "text-emerald-400"
                          : r.status === "ABSENT"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }`}
                    >
                      {r.status}
                    </span>
                  ),
                },
                {
                  header: "Punctuality",
                  accessor: (r) => (
                    <span
                      className={
                        r.punctualityStatus === "LATE"
                          ? "text-[var(--action-warning)] font-medium"
                          : "text-[var(--text-muted)]"
                      }
                    >
                      {r.punctualityStatus ?? "—"}
                    </span>
                  ),
                },
                { header: "First In", accessor: (r) => r.firstInTime ?? "—" },
              ]}
              data={records}
              keyExtractor={(r) => r.id}
            />
          </div>
        </>
      )}
    </div>
  );
}
