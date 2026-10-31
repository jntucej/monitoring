"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { LayoutDashboard } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";

export default function SubjectFacultyTodayPage() {
  return (
    <div className="p-6">
      <PageHeader title="Subject Faculty" subtitle="Subject-scoped teaching view" />
      <EmptyState
        icon={<LayoutDashboard className="w-8 h-8" />}
        title="Subject Faculty Today"
        description="Daily teaching schedule and class overview."
      />
      <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
        <PersonalizedCampusHome />
      </WidgetBoundary>
      <WidgetBoundary name="TaskContinuity" title="Task Continuity">
        <TaskContinuity />
      </WidgetBoundary>
      <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
        <UnifiedCampusCalendar />
      </WidgetBoundary>
      <WidgetBoundary name="QuickActions" title="Quick Actions">
        <QuickActions />
      </WidgetBoundary>
      <WidgetBoundary name="NotificationCenter" title="Notification Center">
        <NotificationCenter />
      </WidgetBoundary>
      <DevContactStrip />
    </div>
  );
}
