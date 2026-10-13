"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { Briefcase, AlertCircle } from "lucide-react";
import { StaffTracking, StaffMember } from "@/components/admin/StaffTracking";
import { useApi } from "@/hooks/useApi";
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import { CampusStatusBar } from "@/components/admin/CampusStatusBar";

export default function AdminStaffPage() {
const api = useApi();

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
        headers: api.getHeaders(),
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

  // Live toggle drives refetch; polls every 30s while Live.
  useLiveRefresh(fetchStaffData, { intervalMs: 30000 });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <CampusStatusBar />
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <Briefcase className="w-6 h-6 text-purple-400" />
            Administrative Staff Oversight & Movement
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Real-time staff gate entries, presence tracking, exception flags (WRN), and log history.
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
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <StaffTracking records={records} summary={summary} />
      )}
    </div>
    </div>
  );
}
