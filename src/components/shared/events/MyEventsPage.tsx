/**
 * shared/events/MyEventsPage.tsx — the student's "My Events" page.
 * The full event loop: discover → confirm (RSVP) → check-in → track →
 * feedback → dispute. Shows upcoming + past events with the user's RSVP
 * status, live check-in, and the dispute form for unmarked attendance.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { EventRsvpBar } from "@/components/shared/events/EventRsvpBar";
import { MyEventStatusCard } from "@/components/shared/events/MyEventStatusCard";
import { EventDisputeForm } from "@/components/shared/events/EventDisputeForm";

interface MyEvent {
  id: string;
  title: string;
  location?: string;
  starts_at: string;
  ends_at?: string;
  category?: string;
}

interface MyEventRow {
  event: MyEvent;
  rsvp: "going" | "interested" | "waitlist" | "cancelled" | null;
  checkedIn: boolean;
}

export function MyEventsPage() {
  const [rows, setRows] = useState<MyEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [disputeFor, setDisputeFor] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const eventsRes = await fetch("/api/campus/events?limit=30", { headers: getAuthHeaders() });
      const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };
      const events: MyEvent[] = eventsData.events ?? [];

      const regRes = await fetch(`/api/campus/events/me/registrations`, {
        headers: getAuthHeaders(),
      });
      const regData = regRes.ok ? await regRes.json() : { registrations: [] };
      const regMap = new Map<string, { rsvp: "going" | "interested" | "waitlist" | "cancelled" | null; checkedIn: boolean }>(
        (regData.registrations ?? []).map((r: { event_id: string; status: string; attended: boolean }) => [
          r.event_id,
          { rsvp: r.status === "cancelled" ? "cancelled" : r.status, checkedIn: r.attended },
        ]),
      );

      const now = Date.now();
      setRows(
        events.map((event) => {
          const reg = regMap.get(event.id);
          return {
            event,
            rsvp: reg?.rsvp ?? null,
            checkedIn: reg?.checkedIn ?? false,
          };
        }),
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => {
      const isPast = new Date(r.event.starts_at).getTime() < now - 3600_000;
      return tab === "past" ? isPast : !isPast;
    });
  }, [rows, tab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading your events…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-bg-elevated p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              tab === t ? "bg-bg text-text" : "text-text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Event rows */}
      {filtered.length === 0 && (
        <p className="py-8 text-center text-xs text-text-muted">No {tab} events.</p>
      )}

      <div className="space-y-3">
        {filtered.map((row) => (
          <div key={row.event.id} className="surface-card p-4 space-y-3">
            <MyEventStatusCard
              event={row.event}
              rsvp={row.rsvp}
              checkedIn={row.checkedIn}
              isOver={tab === "past"}
            />
            <EventRsvpBar
              eventId={row.event.id}
              currentStatus={row.rsvp}
              onChanged={() => fetchEvents()}
            />
            {/* Dispute: only for past events the user attended but weren't marked */}
            {tab === "past" && row.rsvp === "going" && !row.checkedIn && (
              <div>
                {disputeFor === row.event.id ? (
                  <EventDisputeForm eventId={row.event.id} onSubmitted={() => setDisputeFor(null)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setDisputeFor(row.event.id)}
                    className="text-xs text-text-muted underline hover:text-text"
                  >
                    I was there but wasn't marked — dispute
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyEventsPage;
