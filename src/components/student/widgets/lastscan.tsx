"use client";
import { ArrowDownLeft, ArrowUpRight, DoorOpen } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { getTimeAgo } from "@/lib/utils";
import type { StudentWidgetProps } from "./index";

export interface LastScanPayload {
  id: string; direction: "IN" | "OUT"; gateName: string; reason: string | null; timestamp: string;
}

export default function LastScanCard({ payload }: StudentWidgetProps) {
  const scan = payload.lastScan as LastScanPayload | null;
  if (!scan) {
    return (
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <h3 className="mb-3 text-sm font-semibold">Last Gate Scan</h3>
        <EmptyState title="No scans yet" description="Your next gate entry or exit will appear here." />
      </article>
    );
  }
  const isIn = scan.direction === "IN";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  const color = isIn ? "text-emerald-400" : "text-rose-400";
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Last Gate Scan</h3>
        <span className={`flex items-center gap-1 text-xs ${color}`}>
          <Icon className="h-3.5 w-3.5" /> {scan.direction}
        </span>
      </header>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl bg-current/10 p-3 ${color}`}>
          <DoorOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{scan.gateName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            <time dateTime={scan.timestamp} title={new Date(scan.timestamp).toLocaleString()}>
              {getTimeAgo(scan.timestamp)}
            </time>
            {scan.reason && <> · {scan.reason}</>}
          </p>
        </div>
      </div>
    </article>
  );
}
