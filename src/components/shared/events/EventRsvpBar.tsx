/**
 * shared/events/EventRsvpBar.tsx — the RSVP action bar for an event.
 * [Going] [Interested] [Not going] [Waitlist] → POST /api/campus/events/:id/register
 * Shows the user's current status (from event_registrations) and lets them
 * switch. This is step 2 (CONFIRM) of the event loop.
 */

"use client";

import { useState } from "react";
import { Check, X, Clock, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/utils";

type RsvpStatus = "going" | "interested" | "not_going" | "waitlist" | "cancelled";

const OPTIONS: { id: RsvpStatus; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "going", label: "Going", Icon: Check },
  { id: "interested", label: "Interested", Icon: Clock },
  { id: "waitlist", label: "Waitlist", Icon: UserPlus },
  { id: "not_going", label: "Not going", Icon: X },
];

export interface EventRsvpBarProps {
  eventId: string;
  /** The user's RSVP status (from the registrations query). */
  currentStatus?: RsvpStatus | null;
  /** Called after a successful RSVP change. */
  onChanged?: (status: RsvpStatus) => void;
  className?: string;
}

export function EventRsvpBar({ eventId, currentStatus, onChanged, className }: EventRsvpBarProps) {
  const [pending, setPending] = useState<RsvpStatus | null>(null);

  const rsvp = async (status: RsvpStatus) => {
    if (pending) return;
    setPending(status);
    try {
      const res = await fetch(`/api/campus/events/${eventId}/register`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: status === "not_going" ? "cancelled" : status }),
      });
      if (res.ok) onChanged?.(status);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = currentStatus === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => rsvp(id)}
            disabled={pending !== null}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              active
                ? "border-action-primary bg-action-primary/10 text-action-primary"
                : "border-border text-text-secondary hover:border-text-muted",
            )}
          >
            {pending === id ? (
              <Clock className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className={cn("h-3.5 w-3.5", active && "text-action-primary")} />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default EventRsvpBar;
