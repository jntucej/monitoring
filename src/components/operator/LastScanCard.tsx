"use client";

import type { ScanDirection, ExitReason } from "@/lib/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatTime } from "@/lib/utils";

interface LastScanCardProps {
  lastScan: any | null;
}

export function LastScanCard({ lastScan }: LastScanCardProps) {
  const direction = lastScan?.direction ?? "IN";
  const reason = (lastScan?.reason as ExitReason) || undefined;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase mb-2">LAST SCAN</p>
      {lastScan ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-base)] flex-shrink-0 flex items-center justify-center">
            {lastScan.student_photo ? (
              <img src={lastScan.student_photo} alt={lastScan.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{direction === "IN" ? "⬇" : "⬆"}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge direction={direction as ScanDirection} reason={reason} size="sm" />
              <span className="font-mono text-xs text-[var(--text-secondary)]">{lastScan.roll}</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{lastScan.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{formatTime(lastScan.timestamp)}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[var(--text-muted)]">
          <p className="text-3xl mb-1">—</p>
          <p className="text-xs">No scan recorded yet</p>
        </div>
      )}
    </div>
  );
}
