/**
 * shared/calendar/CalendarEventSheet.tsx — tap a calendar day/event to see
 * the deep-link: a class -> attendance, a pass -> live tracker, an event
 * -> RSVP. This is the "tap to act" of the calendar loop. It takes a
 * CalendarEvent and renders a small sheet with the right CTA + deep-link.
 */

"use client";

import Link from "next/link";
import { X, MapPin, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/retention";

export interface CalendarEventSheetProps {
  event: CalendarEvent | null;
  onClose: () => void;
  className?: string;
}

/** Map a calendar category to its deep-link + CTA label. */
function eventDeepLink(ev: CalendarEvent): { href: string; cta: string } {
  const cat = (ev.category || "").toLowerCase();
  if (cat.includes("class") || cat.includes("timetable"))
    return { href: "/student/attendance", cta: "View attendance" };
  if (cat.includes("pass") || cat.includes("outpass") || cat.includes("permission"))
    return { href: "/student/passes", cta: "Track pass" };
  if (cat.includes("meal") || cat.includes("mess") || cat.includes("food"))
    return { href: "/student/mess", cta: "View meals" };
  if (cat.includes("curfew"))
    return { href: "/student", cta: "Today's status" };
  if (cat.includes("exam"))
    return { href: "/student", cta: "Exams" };
  if (cat.includes("event") || cat.includes("workshop") || cat.includes("sport"))
    return { href: "/student/my-events", cta: "RSVP / check-in" };
  return { href: "/student", cta: "Open" };
}

export function CalendarEventSheet({ event, onClose, className }: CalendarEventSheetProps) {
  if (!event) return null;
  const link = eventDeepLink(event);

  return (
    <div className={cn("fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center", className)}>
      <div className="w-full rounded-t-xl bg-bg-elevated p-4 sm:max-w-md sm:rounded-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-text-muted capitalize">{event.category}</p>
            <h3 className="text-base font-semibold text-text-primary">{event.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-bg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-1 text-xs text-text-muted">
          <p className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {new Date(event.date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}
            {event.time ? ` · ${event.time}` : ""}
          </p>
          {event.location && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {event.location}
            </p>
          )}
        </div>

        <div className="mt-4">
          <Link
            href={link.href}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-action-primary px-4 py-2 text-sm font-medium text-white hover:bg-action-primary/90"
          >
            {link.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CalendarEventSheet;
