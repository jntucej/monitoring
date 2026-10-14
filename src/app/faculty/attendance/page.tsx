"use client";

import React, { useState, useCallback } from "react";
import { Users, AlertCircle, RotateCw, Inbox } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { FacultyTracking } from "@/components/admin/FacultyTracking";
import { useAuthStore } from "@/stores/authStore";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { getAuthHeaders } from "@/lib/utils";
import type { FacultyMemberAttendance, DepartmentAttendanceSummary } from "@/lib/types";

interface FacultyAttendanceResponse {
  success: boolean;
  summary?: {
    totalFaculty: number;
    presentToday: number;
    currentlyInside: number;
    currentlyOutside: number;
    lateArrivals: number;
    absentCount: number;
    overallAttendanceRate: number;
  };
  departmentSummaries?: DepartmentAttendanceSummary[];
  records?: FacultyMemberAttendance[];
  error?: string | { message?: string };
}

const EMPTY_SUMMARY = {
  totalFaculty: 0,
  presentToday: 0,
  currentlyInside: 0,
  currentlyOutside: 0,
  lateArrivals: 0,
  absentCount: 0,
  overallAttendanceRate: 0,
};

function FacultyAttendanceInner() {
  const user = useAuthStore((s) => s.user);
  const [records, setRecords] = useState<FacultyMemberAttendance[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacultyAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/faculty/attendance", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data: FacultyAttendanceResponse = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.summary) setSummary(data.summary);
        if (data.departmentSummaries) setDepartmentSummaries(data.departmentSummaries);
      } else {
        const msg =
          typeof data.error === "string"
            ? data.error
            : data.error?.message || "Failed to fetch faculty attendance data";
        setError(msg);
      }
    } catch (err) {
      console.error("Error loading faculty attendance:", err);
      setError("Network error fetching faculty attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + poll every 30s while the global Live toggle is on.
  useLiveRefresh(fetchFacultyAttendance, { intervalMs: 30_000 });

  const isFaculty = user?.role === "faculty";
  const deptCode = user?.departmentId ? ` · dept ${user.departmentId}` : "";

  return (
    <div className="min-h-screen bg-[#0d1220] p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Faculty Attendance Desk
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {isFaculty
              ? `Your department${deptCode || " (assigned branch)"} — live entry/exit, punctuality and attendance metrics.`
              : "Real-time entry/exit logs, punctuality tracking, and department-level attendance metrics."}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {user?.name && <span className="truncate max-w-[220px]">{user.name}</span>}
        </div>
      </div>

      {/* Error banner with retry */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Failed to load faculty attendance: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => fetchFacultyAttendance()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && records.length === 0 && !error ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !error && records.length === 0 && departmentSummaries.length === 0 ? (
        /* Empty state — no attendance records yet */
        <div className="flex flex-col items-center justify-center p-12 bg-[#111827] border border-slate-800 rounded-2xl text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-500" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-200">No attendance records yet</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Faculty appear here after their first gate check-in today. Metrics refresh
              automatically while Live mode is on.
            </p>
          </div>
        </div>
      ) : (
        <FacultyTracking
          records={records}
          summary={summary}
          departmentSummaries={departmentSummaries}
        />
      )}

      <DevContactStrip />
    </div>
  );
}

export default function FacultyAttendancePage() {
  return (
    <AuthGuard allowedRoles={["faculty", "hod", "admin", "sysadmin"]}>
      <FacultyAttendanceInner />
    </AuthGuard>
  );
}
