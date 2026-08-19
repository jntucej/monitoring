"use client";
import React from "react";
import { User, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Scan } from "@/lib/types";

interface RecentScansProps {
  scans: Scan[];
}

export function RecentScans({ scans }: RecentScansProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-sm text-[var(--text-primary)]">Recent Access Activity</h3>
      <div className="space-y-3.5">
        {scans && scans.length > 0 ? (
          scans.map((scan) => (
            <div key={scan.id} className="flex items-center justify-between text-xs py-2 border-b border-[var(--border)]/30 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${scan.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--action-danger)]/10 text-[var(--action-danger)]'}`}>
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{scan.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    {scan.roll}
                    <span className="ml-1.5 text-[10px] font-bold text-[var(--text-secondary)] uppercase">[{scan.department}]</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-1 text-[11px] font-bold ${scan.direction === 'IN' ? 'text-emerald-400' : 'text-[var(--action-danger)]'}`}>
                  {scan.direction === 'IN' ? (
                    <>
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>ENTRY</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>EXIT</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-[var(--text-muted)] text-xs">
            No gate scans registered details on this workspace yet.
          </div>
        )}
      </div>
    </div>
  );
}
