/**
 * shared/pass/PassLiveTracker.tsx — the live "where is my pass" tracker.
 * Step 4 (TRACK) of the pass loop: "Approved 14:40 → gate OUT 15:10 →
 * expected IN by 20:00 (2h left)". Reuses RequestTimeline for the approval
 * chain + adds the live gate-scan state + curfew countdown.
 */

"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, QrCode, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";

export interface PassLiveTrackerProps {
  /** The permission/pass id. */
  passId: string;
  /** The expected return time (curfew). When set, shows a countdown. */
  expectedReturnAt?: string;
  /** Class name. */
  className?: string;
}

export function PassLiveTracker({ passId, expectedReturnAt, className }: PassLiveTrackerProps) {
  const [status, setStatus] = useState<string>("pending");
  const [lastScan, setLastScan] = useState<{ direction: string; at: string } | null>(null);
  const [, setTick] = useState(0);

  // Poll the pass status + last gate scan every 30s (the "live" tracker).
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/passes/${passId}/status`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStatus(data.status ?? status);
        setLastScan(
          data.last_scan
            ? { direction: data.last_scan.direction, at: data.last_scan.at }
            : null,
        );
      } catch {
        // keep last known state
      }
    };
    poll();
    const id = setInterval(poll, 30_000);
    // Tick every 30s for the curfew countdown.
    const tick = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(tick);
    };
  }, [passId]);

  const statusMeta: Record<string, { label: string; accent: string }> = {
    pending: { label: "Pending approval", accent: "text-amber-400" },
    approved: { label: "Approved", accent: "text-green-400" },
    active: { label: "Active — out", accent: "text-blue-400" },
    returned: { label: "Returned on time", accent: "text-green-400" },
    late: { label: "Returned late", accent: "text-red-400" },
    rejected: { label: "Rejected", accent: "text-red-400" },
    cancelled: { label: "Cancelled", accent: "text-text-muted" },
  };
  const meta = statusMeta[status] ?? statusMeta.pending;

  // Curfew countdown.
  const minsLeft = expectedReturnAt
    ? Math.max(0, Math.floor((new Date(expectedReturnAt).getTime() - Date.now()) / 60_000))
    : null;
  const h = minsLeft !== null ? Math.floor(minsLeft / 60) : 0;
  const m = minsLeft !== null ? minsLeft % 60 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status banner */}
      <div className="flex items-center justify-between rounded-lg bg-bg-elevated px-3 py-2.5">
        <div className="flex items-center gap-2">
          {status === "returned" ? (
            <CheckCircle2 className={cn("h-4 w-4", meta.accent)} />
          ) : status === "late" || status === "rejected" ? (
            <AlertTriangle className={cn("h-4 w-4", meta.accent)} />
          ) : (
            <Clock className={cn("h-4 w-4", meta.accent)} />
          )}
          <span className={cn("text-sm font-medium", meta.accent)}>{meta.label}</span>
        </div>
        {expectedReturnAt && status === "active" && (
          <span className="text-xs text-text-muted">
            {minsLeft === 0 ? "due now" : `${h}h ${m}m to curfew`}
          </span>
        )}
      </div>

      {/* Last scan */}
      {lastScan && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <MapPin className="h-3.5 w-3.5" />
          Last scan: <span className="font-medium text-text capitalize">{lastScan.direction}</span> at{" "}
          {new Date(lastScan.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* QR reminder */}
      {(status === "approved" || status === "active") && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <QrCode className="h-3.5 w-3.5" />
          Show your QR at the gate to scan out / in
        </div>
      )}
    </div>
  );
}

export default PassLiveTracker;
