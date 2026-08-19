"use client";

import React from "react";
import { Clock, ShieldCheck, CheckCircle2, UserCheck } from "lucide-react";

interface WorkerStatsProps {
  loading?: boolean;
}

export function WorkerStats({ loading = false }: WorkerStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 animate-pulse">
        <div className="h-24 rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
        <div className="h-24 rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
        <div className="h-24 rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
        <div className="h-24 rounded-xl bg-[var(--surface)] border border-[var(--border)]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Shift Status */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          Shift Status
        </div>
        <div className="text-xl font-bold text-emerald-400">ON DUTY</div>
        <p className="text-[10px] text-[var(--text-muted)] font-mono">Verified via Gate 1</p>
      </div>

      {/* Today Entry */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          Today's Gate Entry
        </div>
        <div className="text-xl font-bold text-[var(--text-primary)] font-mono">05:45 AM</div>
        <p className="text-[10px] text-[var(--text-muted)] font-mono">15 mins before shift</p>
      </div>

      {/* Expected Exit */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Scheduled Exit
        </div>
        <div className="text-xl font-bold text-[var(--text-primary)] font-mono">02:00 PM</div>
        <p className="text-[10px] text-[var(--text-muted)] font-mono">Morning Shift</p>
      </div>

      {/* Shift Compliance */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Shift Adherence
        </div>
        <div className="text-xl font-bold text-[var(--text-primary)] font-mono">98.5%</div>
        <p className="text-[10px] text-[var(--text-muted)] font-mono">Restricted hours compliant</p>
      </div>
    </div>
  );
}
