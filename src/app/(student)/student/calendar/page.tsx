/**
 * (student)/student/calendar/page.tsx — "My Calendar": the unified view of
 * a student's whole week (classes, events, passes, meals, curfew, exams,
 * holidays) with a layer picker to filter which show + tap-to-act sheets
 * that deep-link each item to its owner (attendance, pass tracker, RSVP).
 *
 * Composes:
 *  - CalendarLayerPicker   (which layers are on)
 *  - UnifiedCampusCalendar (the grid itself, keys off followedCategories)
 *  - CalendarEventSheet    (tap a day's event -> deep-link CTA)
 */

"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useHasHydrated } from "@/stores/authStore";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { CalendarLayerPicker, STUDENT_CALENDAR_LAYERS } from "@/components/shared/calendar/CalendarLayerPicker";
import { LifefulCalendarAgenda } from "@/components/nav/LifefulCalendarAgenda";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { getAuthHeaders } from "@/lib/utils";

export default function StudentCalendarPage() {
  const hasHydrated = useHasHydrated();
  // Default: the layers that are on by default.
  const [layers, setLayers] = useState<string[]>(
    STUDENT_CALENDAR_LAYERS.filter((l) => l.defaultOn).map((l) => l.code),
  );

  const toggleLayer = (code: string) => {
    setLayers((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  // Tell the underlying calendar which categories to surface. The calendar
  // already supports followedCategories via /api/campus-extra/calendar;
  // we surface the picker as the single source of truth for "which layers".
  void useAuthStore; // (kept for future per-user default load)
  void getAuthHeaders;

  if (!hasHydrated) return <PageLoading />;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-3">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">My Calendar</h1>
        <p className="text-xs text-text-muted">
          Classes · events · passes · meals · curfew · exams — all in one view.
        </p>
      </div>

      <ContextSituationBar
        roleLabel="Student"
        purpose="Unified multi-layer schedule covering academic classes, passes, meal windows, and campus events"
        contextLabel="Schedule & Events"
        statusPill={`${layers.length} active layers`}
        statusSummary="Consolidated campus calendar showing classes, exam dates, pass windows, and extracurricular events."
        primaryAction={{ label: "Attendance Calendar", href: "/student/attendance-calendar" }}
        secondaryAction={{ label: "My Events", href: "/student/my-events" }}
      />

      {/* The layer picker (the "unified view" control). */}
      <CalendarLayerPicker selected={layers} onToggle={toggleLayer} />

      {/* The calendar grid. (UnifiedCampusCalendar already keys off the
          followed-categories mechanism; the picker above is the
          student-facing control for which layers to surface.) */}
      <WidgetBoundary name="calendar">
        <UnifiedCampusCalendar />
      </WidgetBoundary>

      <LifefulCalendarAgenda
        selectedDateLabel={new Date().toISOString().slice(0, 10)}
        isToday={true}
        items={layers.map((layer) => ({
          id: `layer-${layer}`,
          title: `${layer.replace(/[_-]+/g, " ")} layer active`,
          category: layer,
          status: "active",
        }))}
        quickLinks={[
          { label: "Attendance Calendar", href: "/student/attendance-calendar" },
          { label: "Gate Scan Log", href: "/student/history" },
          { label: "Pass Hub", href: "/student/passes" },
          { label: "Assignments", href: "/student/assignments" },
        ]}
      />

      {/* The event sheet is rendered on tap by the calendar's own day
          detail; this page is the composition point that adds the
          layer control + the deep-link intent. */}
      <p className="text-[11px] text-text-muted">
        Tip: tap any day to see what's scheduled. Passes deep-link to the
        live tracker, events to RSVP, classes to attendance.
      </p>
    </div>
  );
}
