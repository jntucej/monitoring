"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { LayoutDashboard } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";

import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";

export default function SubjectFacultyTodayPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <PageHeader title="Subject Faculty" subtitle="Daily teaching schedule, class attendance, and subject overview." />
      <ContextSituationBar
        roleLabel="Subject Faculty"
        purpose="Record attendance and manage daily lecture schedule across course assignments."
        contextLabel="Subject Teaching Workspace"
        statusTone="info"
        statusSummary="Open your assigned classes or mark today's subject attendance."
        primaryAction={{ label: "Mark Attendance", href: "/faculty/subject/attendance" }}
        secondaryActions={[
          { label: "My Classes", href: "/faculty/subject/classes" },
          { label: "Class Overview", href: "/faculty" },
        ]}
      />
      <details className="surface-card bg-bg-surface p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-text-secondary">
          More workspace tools &amp; calendar
        </summary>
        <div className="mt-4 space-y-4">
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
        </div>
      </details>
    </div>
  );
}
