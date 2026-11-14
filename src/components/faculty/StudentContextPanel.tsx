"use client";

/**
 * StudentContextPanel — 1.12 extracted context panel for the faculty subject
 * drilldown. Renders the selected student's attendance summary in a side panel.
 *
 * Backed by the shared /api/attendance_records feed filtered to the student's
 * roll (light, subject-scoped read). The parent owns selection state, so
 * opening the panel does NOT re-mount the RoleConsole shell.
 */

import { useMemo, useState } from "react";
import { X, Clock, User, CalendarDays, Loader2 } from "lucide-react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { EmptyState } from "@/components/shared/EmptyState";
import { useApiResource } from "@/hooks/useApiResource";

interface AttendanceRow {
  id?: string;
  roll?: string | null;
  student_id?: string | null;
  date?: string | null;
  status?: string | null;
  in_time?: string | null;
  out_time?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

interface AttendanceResponse {
  success: boolean;
  data: AttendanceRow[];
}

interface StudentOverview {
  success: boolean;
  data: {
    students: Array<{
      id: string;
      roll?: string | null;
      name?: string | null;
      year?: number | null;
      section?: string | null;
    }>;
  };
}

export function StudentContextPanel({
  studentId,
  classId,
  onClose,
}: {
  studentId: string;
  classId?: string;
  onClose: () => void;
}) {
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch the roster to resolve student id -> roll + name (light re-read of
  // the class overview already cached by useApiResource's TTL).
  const { data: overview } = useApiResource<StudentOverview>(
    classId ? `/api/faculty/my-class/${classId}` : "/api/attendance_records",
    { ttlMs: 30_000 },
  );

  const student = useMemo(
    () => (overview?.data?.students ?? []).find((s) => s.id === studentId) ?? null,
    [overview, studentId],
  );

  const roll = student?.roll ?? "";

  const { data, loading } = useApiResource<AttendanceResponse>(
    roll
      ? `/api/attendance_records?roll=${encodeURIComponent(roll)}&k=${reloadKey}`
      : "/api/attendance_records",
    { ttlMs: 60_000, enabled: Boolean(roll) },
  );

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    const filtered = roll ? all.filter((r) => (r.roll ?? r.student_id ?? "") === roll || r.student_id === studentId) : all;
    return filtered.slice(0, 25);
  }, [data, roll, studentId]);

  const present = rows.filter((r) => ["PRESENT", "IN", "present"].includes(r.status ?? "")).length;
  const absent = rows.length - present;

  if (loading && !student) {
    return (
      <aside className="min-w-0 w-full border-l border-border bg-bg-surface p-4">
        <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading student…
        </div>
      </aside>
    );
  }

  return (
    <aside className="min-w-0 w-full border-l border-border bg-bg-surface p-4 md:sticky md:top-4 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {student?.name || "Selected student"}
          </p>
          <p className="text-xs font-mono text-text-muted">
            Roll {student?.roll || "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close context panel"
          className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-bg-elevated"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3">
          <div className="flex items-center gap-1.5 text-xs text-action-success">
            <Clock className="w-3.5 h-3.5" /> Present
          </div>
          <p className="mt-1 text-xl font-bold text-action-success tabular-nums">{present}</p>
        </div>
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3">
          <div className="flex items-center gap-1.5 text-xs text-action-danger">
            <CalendarDays className="w-3.5 h-3.5" /> Absent
          </div>
          <p className="mt-1 text-xl font-bold text-action-danger tabular-nums">{absent}</p>
        </div>
      </div>

      {/* Attendance history */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Recent attendance
        </p>
        {loading ? (
          <div className="py-6">
            <PageLoading />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No attendance records"
            description={`No recent attendance rows found for roll ${roll || "—"}.`}
          />
        ) : (
          <ul className="space-y-1.5">
            {rows.map((r, i) => (
              <li
                key={r.id ?? `${r.date}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-text-muted shrink-0" />
                  <span className="text-text-secondary truncate">
                    {r.date ? new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    r.status === "PRESENT" || r.status === "IN"
                      ? "bg-emerald-400/15 text-action-success"
                      : "bg-rose-400/15 text-action-danger"
                  }`}
                >
                  {r.status || "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-xs text-text-muted hover:text-text-primary underline decoration-dotted"
          >
            Refresh
          </button>
        )}
      </div>
    </aside>
  );
}
