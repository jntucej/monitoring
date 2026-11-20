/**
 * shared/pass/PassTrackTimeline — approval + scan timeline for a single pass.
 *
 * Thin wrapper around the existing RequestTimeline, adding a scan-status
 * footer (gate-in / gate-out) when available.
 */

"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { RequestTimeline } from "@/components/shared/RequestTimeline";
import { cn } from "@/lib/utils";

export interface PassScanStatus {
  gateInAt: string | null;
  gateOutAt: string | null;
}

export interface PassTrackTimelineProps {
  ticket: string;
  /** Optional scan status to render a footer. */
  scan?: PassScanStatus;
  className?: string;
}

export function PassTrackTimeline({ ticket, scan, className }: PassTrackTimelineProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <RequestTimeline ticket={ticket} compact />

      {/* Scan-status footer */}
      {scan && (
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Gate in
            </div>
            {scan.gateInAt ? (
              <p className="text-text-primary mt-1">
                {new Date(scan.gateInAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <p className="text-text-muted mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Not scanned in
              </p>
            )}
          </div>
          <div className="flex-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <XCircle className="h-3.5 w-3.5" />
              Gate out
            </div>
            {scan.gateOutAt ? (
              <p className="text-text-primary mt-1">
                {new Date(scan.gateOutAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <p className="text-text-muted mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Not scanned out
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PassTrackTimeline;
