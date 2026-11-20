/**
 * shared/documents/DocumentTrackTimeline.tsx — the document's "TRACK"
 * step: submitted → (verified | rejected). Shows the timeline of status
 * changes for a single document, from the /api/permissions/[ticket]/document
 * shape. Reuses the timeline visual style from ComplaintTimeline.
 */

"use client";

import { CheckCircle2, XCircle, Clock, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocTimelineEvent {
  status: "submitted" | "reviewed" | "verified" | "rejected";
  at: string;
  by?: string;
}

export interface DocumentTrackTimelineProps {
  events: DocTimelineEvent[];
  /** Class name. */
  className?: string;
}

const ICONS: Record<DocTimelineEvent["status"], React.ComponentType<{ className?: string }>> = {
  submitted: Clock,
  reviewed: FileQuestion,
  verified: CheckCircle2,
  rejected: XCircle,
};

const ACCENT: Record<DocTimelineEvent["status"], string> = {
  submitted: "text-text-muted",
  reviewed: "text-blue-400",
  verified: "text-green-400",
  rejected: "text-red-400",
};

export function DocumentTrackTimeline({ events, className }: DocumentTrackTimelineProps) {
  if (events.length === 0) {
    return (
      <p className={cn("text-xs text-text-muted", className)}>No status changes recorded yet.</p>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {events.map((ev, i) => {
        const Icon = ICONS[ev.status] ?? Clock;
        const isLast = i === events.length - 1;
        return (
          <div key={`${ev.status}-${i}`} className="relative flex gap-3">
            {!isLast && (
              <div className="absolute left-[11px] top-6 h-[calc(100%-0.5rem)] w-0.5 bg-border" />
            )}
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-bg",
                ACCENT[ev.status],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 pb-5">
              <p className={cn("text-xs font-medium capitalize", ACCENT[ev.status])}>
                {ev.status}
                {ev.by ? <span className="ml-1.5 text-[10px] text-text-muted">by {ev.by}</span> : null}
              </p>
              <p className="text-[11px] text-text-muted">
                {new Date(ev.at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DocumentTrackTimeline;
