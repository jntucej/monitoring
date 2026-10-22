"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
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
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <PageHeader
        title="Verify meal token"
        subtitle="Scan a student's QR or enter their roll + 6-character code."
      />
      <WidgetBoundary title="Verify token">
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && !activeEventId && (
          <SectionCard title="Choose an event">
            {events.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No active events.</p>
            )}
            <div className="grid gap-2">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setActiveEventId(ev.id)}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--bg-elevated)]"
                >
                  <span>
                    <span className="font-medium text-[var(--text-primary)]">{ev.title}</span>
                    <span className="ml-2 text-[var(--text-muted)]">
                      {ev.eventDate} · {MEAL_LABEL[ev.mealType]}
                    </span>
                  </span>
                  <ScanLine className="h-4 w-4 text-[var(--text-muted)]" />
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
              className="mb-3 text-sm text-[var(--text-secondary)] underline"
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
