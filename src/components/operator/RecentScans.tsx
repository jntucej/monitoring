"use client";
import React from "react";
import { User, ArrowDownLeft, ArrowUpRight, ChevronRight, ShieldCheck } from "lucide-react";
import type { Scan } from "@/lib/types";

interface RecentScansProps {
  scans: Scan[];
  onSelect?: (scan: Scan) => void;
}

export function RecentScans({ scans, onSelect }: RecentScansProps) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4 shadow-sm">
      <h3 className="font-semibold text-sm text-[var(--text-primary)]">Recent Access Activity</h3>
      <p className="text-[10px] text-[var(--text-muted)] -mt-2">Tap any record to open the person overview.</p>
      <div className="space-y-3.5">
        {scans && scans.length > 0 ? (
          scans.map((scan) => (
            <button
              key={scan.id}
              onClick={() => onSelect?.(scan)}
              className="w-full flex items-center justify-between text-xs py-2 border-b border-[var(--border)]/30 last:border-b-0 hover:bg-[var(--bg-base)] rounded-lg px-1 -mx-1 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${scan.direction === 'IN' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--action-danger)]/10 text-[var(--action-danger)]'}`}>
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)] truncate">{scan.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">{scan.roll}</p>
                  {scan.operatorName ? (
                    <p className="text-[10px] text-[var(--text-secondary)] inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> by {scan.operatorName}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
            </button>
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
