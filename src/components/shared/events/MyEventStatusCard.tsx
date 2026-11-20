/**
 * shared/events/MyEventStatusCard.tsx — "You're going · Gate 2 · 2h left"
 * The live status card for an event the user has RSVP'd to. Shows:
 *   - their RSVP status + check-in state
 *   - the event window (start/end + time remaining)
 *   - a check-in button (step 4 of the event loop)
 *   - a feedback link (step 6)
 */

"use client";

import { Clock, MapPin, Star, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";
import { useState } from "react";
import { EventFeedbackSheet } from "@/components/shared/events/EventFeedbackSheet";

export interface MyEventStatusCardProps {
  event: {
    id: string;
    title: string;
    location?: string;
    starts_at: string;
    ends_at?: string;
  };
  /** The user's RSVP status. */
  rsvp: "going" | "interested" | "waitlist" | "cancelled" | null;
  /** Whether the user has checked in. */
  checkedIn?: boolean;
  /** Whether the event is over (for the feedback CTA). */
  isOver?: boolean;
  className?: string;
}

export function MyEventStatusCard({
  event,
  rsvp,
  checkedIn,
  isOver,
  className,
}: MyEventStatusCardProps) {
  const [checkingIn, setCheckingIn] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const now = Date.now();
  const start = new Date(event.starts_at).getTime();
  const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 3600_000;
  const minutesLeft = Math.max(0, Math.floor((end - now) / 60_000));
  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;

  const checkIn = async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      await fetch(`/api/campus/events/${event.id}/attend`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ self: true }),
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const statusLabel =
    rsvp === "going" ? "You're going" :
    rsvp === "interested" ? "Interested" :
    rsvp === "waitlist" ? "On waitlist" :
    rsvp === "cancelled" ? "Not going" : "No RSVP";

  return (
    <div className={cn("surface-card p-4 space-y-3", className)}>
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text">{event.title}</p>
          <p className="text-xs text-text-muted">{statusLabel}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            rsvp === "going" && "bg-green-500/10 text-green-400",
            rsvp === "interested" && "bg-blue-500/10 text-blue-400",
            rsvp === "waitlist" && "bg-amber-500/10 text-amber-400",
            (rsvp === "cancelled" || !rsvp) && "bg-bg-elevated text-text-muted",
          )}
        >
          {rsvp ?? "—"}
        </span>
      </div>

      {/* Meta: location + time */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        {event.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </span>
        )}
        {!isOver && rsvp === "going" && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {h > 0 ? `${h}h ${m}m left` : `${m}m left`}
          </span>
        )}
      </div>

      {/* Actions */}
      {rsvp === "going" && !checkedIn && !isOver && (
        <button
          type="button"
          onClick={checkIn}
          disabled={checkingIn}
          className="flex items-center gap-2 rounded-lg bg-action-primary px-4 py-2 text-xs font-medium text-bg hover:bg-action-primary/90 disabled:opacity-50"
        >
          <QrCode className="h-4 w-4" />
          {checkingIn ? "Checking in…" : "Check in now"}
        </button>
      )}

      {checkedIn && !isOver && (
        <p className="text-xs text-green-400">✓ Checked in · event in progress</p>
      )}

      {isOver && (
        <button
          type="button"
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text"
        >
          <Star className="h-3.5 w-3.5" />
          {showFeedback ? "Rating saved" : "Leave feedback"}
        </button>
      )}
      <EventFeedbackSheet
        event={
          isOver
            ? { id: event.id, title: event.title, attendedAt: event.ends_at }
            : null
        }
        onClose={() => setShowFeedback(false)}
      />
    </div>
  );
}

export default MyEventStatusCard;
