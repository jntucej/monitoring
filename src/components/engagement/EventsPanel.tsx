"use client";

/**
 * Events & Registration panel — grid of upcoming campus events.
 * Data comes from /api/campus/events (real rows); each card is an
 * EventCard with a working, idempotent Register button.
 */
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Loader2, Inbox } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EventCard } from "./EventCard";
import type { CampusEvent } from "@/lib/engagement";

export function EventsPanel({ limit = 12 }: { limit?: number }) {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campus/events", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Failed to load events");
      }
      setEvents(json.data.events ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = events.slice(0, limit);

  return (
    <WidgetBoundary title="Campus Events">
      <section aria-label="Campus events" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <CalendarDays className="h-4 w-4 text-sky-400" aria-hidden />
            Campus Events
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] motion-safe:transition-colors motion-reduce:transition-none"
            aria-label="Refresh events"
          >
            Refresh
          </button>
        </div>

        {loading && events.length === 0 ? (
          <div className="mt-8 flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Loading events…
          </div>
        ) : error && events.length === 0 ? (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : shown.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center text-[var(--text-muted)]">
            <Inbox className="h-6 w-6 opacity-50" aria-hidden />
            <p className="text-sm">No upcoming campus events.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onChanged={() => {
                  // Optimistic count bump so sibling cards stay honest
                  // without a full refetch.
                  setEvents((prev) =>
                    prev.map((e) =>
                      e.id === event.id
                        ? {
                            ...e,
                            isRegistered: true,
                            registrationStatus: "registered",
                            registrations: Math.min(
                              e.capacity ?? Number.MAX_SAFE_INTEGER,
                              e.registrations + 1
                            ),
                          }
                        : e
                    )
                  );
                }}
              />
            ))}
          </div>
        )}
        {events.length > limit ? (
          <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
            Showing {shown.length} of {events.length} events
          </p>
        ) : null}
      </section>
    </WidgetBoundary>
  );
}
