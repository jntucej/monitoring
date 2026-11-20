/**
 * shared/complaints/ComplaintTimeline.tsx — the complaint's lifecycle
 * (raised → acknowledged → assigned → in_progress → resolved). Reuses the
 * existing RequestTimeline shape. The "TRACK" step of the complaint loop.
 */

"use client";

import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComplaintTimelineEvent {
  status: string;
  at: string;
  note?: string;
}

export interface ComplaintTimelineProps {
  events: ComplaintTimelineEvent[];
  /** The current status (for the "now" marker). */
  currentStatus?: string;
  className?: string;
}

const STATUS_ORDER = [
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "resolved",
];

export function ComplaintTimeline({
  events,
  currentStatus,
  className,
}: ComplaintTimelineProps) {
  // Build the ordered steps: which statuses have happened + timestamps.
  const happened = new Set(events.map((e) => e.status));
  const isDone = (s: string) =>
    happened.has(s) ||
    (currentStatus === "resolved" ? STATUS_ORDER.indexOf(s) <= STATUS_ORDER.indexOf("resolved") : false);

  return (
    <div className={cn("space-y-0", className)}>
      {STATUS_ORDER.map((status, i) => {
        const done = isDone(status);
        const isCurrent = status === currentStatus;
        const event = events.find((e) => e.status === status);
        const isLast = i === STATUS_ORDER.length - 1;
        return (
          <div key={status} className="relative flex gap-3">
            {/* Line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-0.5rem)] w-0.5",
                  done ? "bg-action-primary/40" : "bg-border",
                )}
              />
            )}
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px]",
                done
                  ? "border-action-primary bg-action-primary/10 text-action-primary"
                  : "border-border bg-bg text-text-muted",
                isCurrent && "ring-2 ring-action-primary/30",
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i === 0 ? <Clock className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
            </div>
            {/* Label */}
            <div className="flex-1 pb-5">
              <p className={cn("text-xs font-medium capitalize", done ? "text-text" : "text-text-muted")}>
                {status.replace("_", " ")}
                {isCurrent && <span className="ml-2 text-[10px] text-action-primary">← current</span>}
              </p>
              {event?.at && (
                <p className="text-[11px] text-text-muted">
                  {new Date(event.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {event?.note && <p className="text-[11px] text-text-muted italic">"{event.note}"</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ComplaintTimeline;
