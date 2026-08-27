"use client";

import React, { useEffect, useState } from "react";
import { Briefcase, RefreshCw, AlertCircle } from "lucide-react";
import { StaffTracking, StaffMember } from "@/components/admin/StaffTracking";
import { getAuthHeaders } from "@/lib/utils";

export default function AdminStaffPage() {
  const [records, setRecords] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    presentToday: 0,
    currentlyInside: 0,
    currentlyOutside: 0,
    warningCount: 0,
    overallAttendanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/staff/attendance", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.summary) setSummary(data.summary);
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to fetch staff data";
        setError(msg);
      }
    } catch (err) {
      console.error("Error loading staff data:", err);
      setError("Network error fetching staff oversight data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-400" />
            Administrative Staff Oversight & Movement
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time staff gate entries, presence tracking, exception flags (WRN), and log history.
          </p>
        </div>
        <button
          onClick={fetchStaffData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Live Data
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && records.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <StaffTracking records={records} summary={summary} />
      )}
    </div>
  );
}
