"use client";

import React, { useState } from "react";
import { HardHat, AlertCircle } from "lucide-react";
import { WorkerShiftTracker, WorkerShift } from "@/components/admin/WorkerShiftTracker";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import { CampusStatusBar } from "@/components/admin/CampusStatusBar";

export default function AdminWorkersPage() {
  const [shifts, setShifts] = useState<WorkerShift[]>([]);
  const [summary, setSummary] = useState({
    totalActive: 0,
    onShift: 0,
    lateArrivals: 0,
    offShift: 0,
    shiftAdherenceRate: 100,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/workers/shifts", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setShifts(data.shifts || []);
        if (data.summary) setSummary(data.summary);
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to load worker shifts";
        setError(msg);
      }
    } catch (err) {
      console.error("Error fetching worker shifts:", err);
      setError("Network error loading worker shifts");
    } finally {
      setLoading(false);
    }
  };

  // Live toggle drives refetch; polls every 30s while Live.
  useLiveRefresh(fetchShifts, { intervalMs: 30000 });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <CampusStatusBar />
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <HardHat className="w-6 h-6 text-amber-500" />
            Worker & Contractor Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Track daily worker shifts, contractor compliance, late check-ins, and duty progress.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && shifts.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <WorkerShiftTracker shifts={shifts} summary={summary} />
      )}
    </div>
    </div>
  );
}


