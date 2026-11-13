"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { Users, ScanLine } from "lucide-react";

interface LivePayload {
  stats: { onCampusNow: number; scansToday: number };
}

export function CampusPulseStrip() {
  const { data } = useApiResource<LivePayload>("/api/home/live", {
    ttlMs: 30_000,
  });
  if (!data?.stats) return null;
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-bg-surface/50 px-3 py-2 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1">
        <Users className="h-3.5 w-3.5" aria-hidden />
        {data.stats.onCampusNow} on campus now
      </span>
      <span className="inline-flex items-center gap-1">
        <ScanLine className="h-3.5 w-3.5" aria-hidden />
        {data.stats.scansToday.toLocaleString()} scans today
      </span>
    </div>
  );
}
