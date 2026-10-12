"use client";

/**
 * EngagementWidgets — composes the full Campus Engagement module into a
 * responsive dashboard grid. Widget ordering and pinning come from
 * `useEngagementStore`; notification preferences (quiet hours / daily
 * summary) gate which extra reminder text is shown in the card.
 *
 * The composition renders each widget inside its own WidgetBoundary so
 * one widget failing never takes down the rest.
 */
import type { ReactElement } from "react";
import { useMemo } from "react";
import {
  useEngagementStore,
  resolveWidgetOrder,
  type EngagementWidgetId,
} from "@/stores/engagementStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MyCampusProfile } from "./MyCampusProfile";
import { CampusFeed } from "./CampusFeed";
import { EventsPanel } from "./EventsPanel";
import { Achievements } from "./Achievements";
import { PersonalGoals } from "./PersonalGoals";
import { CampusAssistant } from "./CampusAssistant";
import { SemesterRecap } from "./SemesterRecap";
import { DashboardCustomizer } from "./DashboardCustomizer";

const WIDGETS: Record<EngagementWidgetId, () => ReactElement | null> = {
  profile: () => <MyCampusProfile />,
  feed: () => <CampusFeed limit={12} />,
  events: () => <EventsPanel limit={6} />,
  achievements: () => <Achievements />,
  goals: () => <PersonalGoals />,
  assistant: () => <CampusAssistant />,
  recap: () => <SemesterRecap />,
  notifications: () => <NotificationPrefsSummary />,
};

/**
 * The "notifications" widget renders a compact summary of the user's
 * notification preferences from the engagement store. It does NOT
 * replace the NotificationCenter panel the app already ships; it is
 * only the engagement-module's own quiet-hours / daily-summary view.
 */
function NotificationPrefsSummary() {
  const prefs = useEngagementStore((s) => s.notificationPrefs);
  const quietActive =
    prefs.quietHours &&
    (() => {
      const now = new Date();
      const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (prefs.quietHoursFrom <= prefs.quietHoursTo) {
        return cur >= prefs.quietHoursFrom && cur < prefs.quietHoursTo;
      }
      return cur >= prefs.quietHoursFrom || cur < prefs.quietHoursTo; // overnight
    })();

  return (
    <section
      aria-label="Notification preferences summary"
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0"
    >
      <h2 className="text-sm font-bold text-[var(--text-primary)]">
        Notification preferences
      </h2>
      <ul className="mt-3 space-y-2 text-xs text-[var(--text-muted)]">
        <li>
          <strong className="text-[var(--text-primary)]">Quiet hours</strong>:{" "}
          {prefs.quietHours
            ? `${prefs.quietHoursFrom}–${prefs.quietHoursTo}${quietActive ? " · active now" : ""}`
            : "off"}
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Daily summary</strong>:{" "}
          {prefs.dailySummary ? `at ${prefs.dailySummaryTime}` : "off"}
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Event reminders</strong>:{" "}
          {prefs.eventReminders ? "on" : "off"}
        </li>
        <li>
          <strong className="text-[var(--text-primary)]">Announcement alerts</strong>:{" "}
          {prefs.announcementAlerts ? "on" : "off"}
        </li>
      </ul>
      <p className="mt-3 text-[10px] text-[var(--text-muted)]">
        Preferences only change how digests are surfaced to you — delivery
        permissions are always enforced by the server.
      </p>
    </section>
  );
}

export function EngagementWidgets() {
  const widgetOrder = useEngagementStore((s) => s.widgetOrder);
  const pinnedWidgets = useEngagementStore((s) => s.pinnedWidgets);

  const order = useMemo(
    () => resolveWidgetOrder({ widgetOrder, pinnedWidgets }),
    [widgetOrder, pinnedWidgets]
  );

  return (
    <div className="space-y-6">
      <WidgetBoundary title="Engagement dashboard">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {order.map((id) => {
            const Render = WIDGETS[id];
            if (!Render) return null;
            return <Render key={id} />;
          })}
        </div>
      </WidgetBoundary>

      <DashboardCustomizer />
    </div>
  );
}
