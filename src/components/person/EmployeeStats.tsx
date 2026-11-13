"use client";

import React from "react";
import { Calendar, Clock, ShieldCheck } from "lucide-react";

interface EmployeeStatsProps {
  stats?: {
    isOnCampus?: boolean | null;
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
      <div className="bg-bg-surface border border-border rounded-xl p-6 animate-pulse space-y-4">
        <div className="h-6 w-36 bg-[var(--border)] rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-[var(--border)] rounded-lg" />
          <div className="h-20 bg-[var(--border)] rounded-lg" />
        </div>
      </div>
    );
  }

  const isOnCampus = stats?.isOnCampus ?? null;
  const daysPresent = stats?.daysPresentThisWeek ?? null;
  const monthlyScans = stats?.totalScansThisMonth ?? null;
  const lateCount = stats?.lateEntriesCount ?? null;
  const lastScan = stats?.lastScanTime
    ? new Date(stats.lastScanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-action-success" />
          Attendance & Status
        </h3>

        {/* Realtime Status Badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isOnCampus === null
              ? "bg-bg-base text-text-muted border-border"
              : isOnCampus
              ? "bg-emerald-500/10 text-action-success border-emerald-500/30"
              : "bg-amber-500/10 text-action-warning border-amber-500/30"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnCampus === null ? "bg-[var(--text-muted)]" : isOnCampus ? "bg-action-success animate-ping" : "bg-action-warning"}`} />
          {isOnCampus === null ? "UNKNOWN" : isOnCampus ? "ON CAMPUS" : "OFF CAMPUS"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-bg-base border border-border space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
            <Calendar className="w-4 h-4 text-action-success" />
            This Week
          </div>
          <p className="text-2xl font-bold text-text-primary">{daysPresent !== null ? daysPresent : "—"} <span className="text-xs font-normal text-text-muted">Days</span></p>
        </div>

        <div className="p-4 rounded-xl bg-bg-base border border-border space-y-1">
          <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
            <Clock className="w-4 h-4 text-unit-c" />
            This Month
          </div>
          <p className="text-2xl font-bold text-text-primary">{monthlyScans !== null ? monthlyScans : "—"} <span className="text-xs font-normal text-text-muted">Scans</span></p>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4 text-xs text-text-muted">
        <div className="flex items-center justify-between">
          <span>Last Recorded Scan:</span>
          <span className="font-mono text-text-primary font-semibold">{lastScan ? `${lastScan} (${stats?.lastScanType || "—"})` : "No data"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Late Entries Recorded:</span>
          <span className={`font-semibold ${lateCount !== null && lateCount > 0 ? "text-action-warning" : "text-action-success"}`}>{lateCount !== null ? lateCount : "—"}</span>
        </div>
      </div>
    </div>
  );
}
