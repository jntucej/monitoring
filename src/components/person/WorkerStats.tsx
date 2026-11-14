"use client";

import React, { useEffect, useState } from "react";
import { Clock, ShieldCheck, UserCheck } from "lucide-react";

interface WorkerStatsProps {
  loading?: boolean;
  uniqueId?: string;
}

interface WorkerScanData {
  shiftStatus: "ON DUTY" | "OFF DUTY" | null;
  todayEntry: string | null;
  todayExit: string | null;
  adherencePct: number | null;
}

export function WorkerStats({ loading = false, uniqueId }: WorkerStatsProps) {
  const [data, setData] = useState<WorkerScanData>({
    shiftStatus: null,
    todayEntry: null,
    todayExit: null,
    adherencePct: null,
  });
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!uniqueId) return;
    let cancelled = false;
    const load = async () => {
      setFetching(true);
      try {
        const res = await fetch(`/api/persons/${encodeURIComponent(uniqueId)}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && res.ok && json.success) {
          const d = json.data;
          const campusStatus = d?.campusStatus;
          const history = d?.history || [];
          const isIn = campusStatus === "IN";

          // Get today's first IN and last OUT scan
          const today = new Date().toDateString();
          const todayScans = history.filter((s: any) => new Date(s.timestamp).toDateString() === today);
          const firstTodayIn = todayScans.slice().reverse().find((s: any) => s.direction === "IN");
          const lastTodayOut = todayScans.find((s: any) => s.direction === "OUT");

          const entryTime = firstTodayIn
            ? new Date(firstTodayIn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : null;
          const exitTime = lastTodayOut
            ? new Date(lastTodayOut.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : null;

          const validScans = history.filter((s: any) => {
            const hr = new Date(s.timestamp).getHours();
            return hr >= 6 && hr <= 22;
          });
          const adherence = history.length > 0 ? Math.round((validScans.length / history.length) * 100) : 100;

          setData({
            shiftStatus: isIn ? "ON DUTY" : "OFF DUTY",
            todayEntry: entryTime,
            todayExit: exitTime,
            adherencePct: adherence,
          });
        }
      } catch {
        // leave as null
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uniqueId]);

  if (loading || fetching) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse">
        <div className="h-24 rounded-xl bg-bg-surface border border-border" />
        <div className="h-24 rounded-xl bg-bg-surface border border-border" />
        <div className="h-24 rounded-xl bg-bg-surface border border-border" />
        <div className="h-24 rounded-xl bg-bg-surface border border-border" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Shift Status */}
      <div className="surface-card p-4 bg-bg-surface space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
          <UserCheck className="w-3.5 h-3.5 text-action-primary" />
          Shift Status
        </div>
        <div className={`text-xl font-bold ${data.shiftStatus === "ON DUTY" ? "text-action-success" : data.shiftStatus === "OFF DUTY" ? "text-action-warning" : "text-text-muted"}`}>
          {data.shiftStatus ?? "UNKNOWN"}
        </div>
        <p className="text-xs text-text-muted font-mono">
          {data.shiftStatus === "ON DUTY" ? "Currently on campus" : data.shiftStatus === "OFF DUTY" ? "Not on campus" : "No data"}
        </p>
      </div>

      {/* Today Entry */}
      <div className="surface-card p-4 bg-bg-surface space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
          <Clock className="w-3.5 h-3.5 text-unit-c" />
          Today&#39;s Gate Entry
        </div>
        <div className="text-xl font-bold text-text-primary font-mono">{data.todayEntry ?? "—"}</div>
        <p className="text-xs text-text-muted font-mono">
          {data.todayEntry ? "First recorded IN scan" : "No entry today"}
        </p>
      </div>

      {/* Last Exit */}
      <div className="surface-card p-4 bg-bg-surface space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
          <Clock className="w-3.5 h-3.5 text-action-warning" />
          Last Recorded Exit
        </div>
        <div className="text-xl font-bold text-text-primary font-mono">{data.todayExit ?? "—"}</div>
        <p className="text-xs text-text-muted font-mono">
          {data.todayExit ? "Last OUT scan" : "No exit logged yet"}
        </p>
      </div>

      {/* Shift Compliance */}
      <div className="surface-card p-4 bg-bg-surface space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-action-success" />
          Shift Adherence
        </div>
        <div className="text-xl font-bold text-text-primary font-mono">
          {data.adherencePct !== null ? `${data.adherencePct}%` : "—"}
        </div>
        <p className="text-xs text-text-muted font-mono">
          {data.adherencePct !== null ? "Restricted hours compliant" : "Requires history data"}
        </p>
      </div>
    </div>
  );
}

