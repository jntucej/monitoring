"use client";

import React, { useState } from "react";
import { Users, AlertCircle } from "lucide-react";
import { FacultyTracking } from "@/components/admin/FacultyTracking";
import { FacultyMemberAttendance, DepartmentAttendanceSummary } from "@/app/api/faculty/attendance/route";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import { CampusStatusBar } from "@/components/admin/CampusStatusBar";

export default function AdminFacultyPage() {
  const [records, setRecords] = useState<FacultyMemberAttendance[]>([]);
  const [summary, setSummary] = useState({
    totalFaculty: 0,
    presentToday: 0,
    currentlyInside: 0,
    currentlyOutside: 0,
    lateArrivals: 0,
    absentCount: 0,
    overallAttendanceRate: 0,
  });
  const [departmentSummaries, setDepartmentSummaries] = useState<DepartmentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFacultyAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/faculty/attendance", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.summary) setSummary(data.summary);
        if (data.departmentSummaries) setDepartmentSummaries(data.departmentSummaries);
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to fetch faculty attendance data";
        setError(msg);
      }
    } catch (err) {
      console.error("Error loading faculty attendance:", err);
      setError("Network error fetching faculty attendance");
    } finally {
      setLoading(false);
    }
  };

  // Live toggle drives refetch; polls every 30s while Live.
  useLiveRefresh(fetchFacultyAttendance, { intervalMs: 30000 });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <CampusStatusBar />
      <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Faculty Attendance & Movement Oversight
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time entry/exit logs, punctuality tracking, and department-level attendance metrics.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && records.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <FacultyTracking
          records={records}
          summary={summary}
          departmentSummaries={departmentSummaries}
        />
      )}
    </div>
    </div>
  );
}
