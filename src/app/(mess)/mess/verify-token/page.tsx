"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/shared/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { MEAL_LABEL, effectiveEventStatus, type SpecialEvent } from "@/lib/mess-reviews";
import { TokenVerifier } from "@/components/mess/TokenVerifier";

export default function VerifyTokenPage() {
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/mess/special-events?upcomingOnly=1", {
          headers: getAuthHeaders(), cache: "no-store",
        });
        const body = await res.json().catch(() => null);
        if (res.ok && body?.data != null) {
          const list: SpecialEvent[] = body.data.events ?? [];
          setEvents(list.filter((e) => {
            const s = effectiveEventStatus(e);
            return s === "OPEN" || s === "CLOSED" || s === "SCHEDULED";
          }));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Verify meal token"
        subtitle="Scan a student's QR or enter their roll + 6-character code."
      />
      <div className="my-4">
        <ContextSituationBar
          roleLabel="Mess In-Charge"
          purpose="Verify event meal passes, confirm attendee identity via roll number, and mark special tokens served"
          contextLabel={`Event Token Verification · ${events.length} Active Events`}
          statusSummary={
            events.length > 0
              ? `${events.length} active special event${events.length === 1 ? "" : "s"} scheduled. Select an event to verify student tokens.`
              : "No active special dining events scheduled. Scan standard meal tokens at the Token Scanner."
          }
          severity="info"
          primaryAction={{ label: "Token Scanner", href: "/mess/scan" }}
          secondaryActions={[
            { label: "Special Events", href: "/mess/special-events" },
            { label: "Daily Meal Counts", href: "/mess/daily-meal-counts" },
            { label: "Mess Overview", href: "/mess" },
          ]}
        />
      </div>
      <WidgetBoundary title="Verify token">
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && !activeEventId && (
          <SectionCard title="Choose an event">
            {events.length === 0 && (
              <p className="text-sm text-text-muted">No active events.</p>
            )}
            <div className="grid gap-2">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setActiveEventId(ev.id)}
                  className="surface-card flex min-h-11 items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-elevated"
                >
                  <span>
                    <span className="font-medium text-text-primary">{ev.title}</span>
                    <span className="ml-2 text-text-muted">
                      {ev.eventDate} · {MEAL_LABEL[ev.mealType]}
                    </span>
                  </span>
                  <ScanLine className="h-4 w-4 text-text-muted" />
                </button>
              ))}
            </div>
          </SectionCard>
        )}
        {activeEventId && (
          <>
            <button
              type="button"
              onClick={() => setActiveEventId(null)}
              className="mb-3 inline-flex min-h-11 items-center text-sm text-text-secondary underline"
            >
              ← Change event
            </button>
            <TokenVerifier eventId={activeEventId} />
          </>
        )}
      </WidgetBoundary>
    </div>
  );
}
