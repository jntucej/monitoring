"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { FacultyTracking } from "@/components/admin/FacultyTracking";
import { FacultyMemberAttendance, DepartmentAttendanceSummary } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import { CampusStatusBar } from "@/components/admin/CampusStatusBar";
export default function AdminFacultyPage() {
const api = useApi();

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
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.success) {
        const payload = json.data ?? json;
        setRecords(payload.records || []);
        if (payload.summary) setSummary(payload.summary);
        if (payload.departmentSummaries) setDepartmentSummaries(payload.departmentSummaries);
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Failed to fetch faculty attendance data";
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
<<<<<<< HEAD
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <Users className="w-6 h-6 text-indigo-400" />
            Faculty Attendance & Movement Oversight
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
=======
          <p className="text-sm text-[var(--text-muted)]">
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
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
