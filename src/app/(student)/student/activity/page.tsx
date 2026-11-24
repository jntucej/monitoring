"use client";

import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { RecentActivity } from "@/components/student/RecentActivity";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";

// Relocated self-history widgets (moved off the home screen).
export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-3">
      <h1 className="text-lg font-semibold text-primary">
        My Activity
      </h1>
      <ContextSituationBar
        roleLabel="Student"
        purpose="Monitor recent campus interactions, timeline events, and task continuity"
        contextLabel="Activity & Timeline"
        statusSummary="Review your chronological activity timeline and resume in-flight campus tasks."
        primaryAction={{ label: "Gate Scan Log", href: "/student/history" }}
        secondaryAction={{ label: "Student Home", href: "/student" }}
      />
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
