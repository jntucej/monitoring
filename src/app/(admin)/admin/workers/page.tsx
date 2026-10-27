"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { WorkerShiftTracker, WorkerShift } from "@/components/admin/WorkerShiftTracker";
import { useApi } from "@/hooks/useApi";
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import { CampusStatusBar } from "@/components/admin/CampusStatusBar";
export default function AdminWorkersPage() {
const api = useApi();

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
        headers: api.getHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.success) {
        const payload = json.data ?? json;
        setShifts(payload.shifts || []);
        if (payload.summary) setSummary(payload.summary);
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Failed to load worker shifts";
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
<<<<<<< HEAD
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <HardHat className="w-6 h-6 text-amber-500" />
            Worker & Contractor Management
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
=======
          <p className="text-sm text-[var(--text-muted)]">
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
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


