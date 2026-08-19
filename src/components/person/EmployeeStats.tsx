"use client";

import React from "react";
import { Calendar, CheckCircle2, Clock, ShieldCheck, AlertCircle } from "lucide-react";

interface EmployeeStatsProps {
  stats?: {
    isOnCampus?: boolean;
    lastScanTime?: string;
    lastScanType?: "IN" | "OUT";
    daysPresentThisWeek?: number;
    totalScansThisMonth?: number;
    lateEntriesCount?: number;
  } | null;
  loading?: boolean;
}

export function EmployeeStats({ stats, loading = false }: EmployeeStatsProps) {
  if (loading) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 animate-pulse space-y-4">
        <div className="h-6 w-36 bg-[var(--border)] rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-[var(--border)] rounded-lg" />
          <div className="h-20 bg-[var(--border)] rounded-lg" />
        </div>
      </div>
    );
  }

  const isOnCampus = stats?.isOnCampus ?? true;
  const daysPresent = stats?.daysPresentThisWeek ?? 5;
  const monthlyScans = stats?.totalScansThisMonth ?? 22;
  const lateCount = stats?.lateEntriesCount ?? 0;
  const lastScan = stats?.lastScanTime ? new Date(stats.lastScanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "08:45 AM";

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Attendance & Status
        </h3>

        {/* Realtime Status Badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isOnCampus
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-500 border-amber-500/30"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnCampus ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
          {isOnCampus ? "ON CAMPUS" : "OFF CAMPUS"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
            <Calendar className="w-4 h-4 text-emerald-400" />
            This Week
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{daysPresent} <span className="text-xs font-normal text-[var(--text-muted)]">Days</span></p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] space-y-1">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
            <Clock className="w-4 h-4 text-purple-400" />
            This Month
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{monthlyScans} <span className="text-xs font-normal text-[var(--text-muted)]">Scans</span></p>
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]">
        <div className="flex items-center justify-between">
          <span>Last Recorded Scan:</span>
          <span className="font-mono text-[var(--text-primary)] font-semibold">{lastScan} ({stats?.lastScanType || "IN"})</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Late Entries Recorded:</span>
          <span className={`font-semibold ${lateCount > 0 ? "text-amber-500" : "text-emerald-400"}`}>{lateCount}</span>
        </div>
      </div>
    </div>
  );
}
