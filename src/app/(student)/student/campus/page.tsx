"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { CampusFeed } from "@/components/engagement/CampusFeed";
import { EventsPanel } from "@/components/engagement/EventsPanel";
import { Communities } from "@/components/engagement/Communities";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";

// The campus aggregator: what used to clutter the home screen, now one
// tap away from QuickLinksRow.
export default function CampusPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        Campus
      </h1>
      <WidgetBoundary name="feed">
        <CampusFeed />
      </WidgetBoundary>
      <WidgetBoundary name="events">
        <EventsPanel />
      </WidgetBoundary>
      <WidgetBoundary name="communities">
        <Communities />
      </WidgetBoundary>
      <WidgetBoundary name="calendar">
        <UnifiedCampusCalendar />
      </WidgetBoundary>
    </div>
  );
}
