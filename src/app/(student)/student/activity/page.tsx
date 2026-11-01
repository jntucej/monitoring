"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { RecentActivity } from "@/components/student/RecentActivity";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";

// Relocated self-history widgets (moved off the home screen).
export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">
        My Activity
      </h1>
      <WidgetBoundary name="recent-activity">
        <RecentActivity />
      </WidgetBoundary>
      <WidgetBoundary name="activity-timeline">
        <ActivityTimeline />
      </WidgetBoundary>
      <WidgetBoundary name="task-continuity">
        <TaskContinuity />
      </WidgetBoundary>
      <WidgetBoundary name="personalized-campus-home">
        <PersonalizedCampusHome />
      </WidgetBoundary>
    </div>
  );
}
