"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PageHeader } from "@/components/shared/PageHeader";

export default function OperatorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["operator", "admin", "sysadmin"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <PageHeader title="Operator" subtitle="Gate operations" />
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
            <PersonalizedCampusHome />
          </WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity">
            <TaskContinuity />
          </WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
            <UnifiedCampusCalendar />
          </WidgetBoundary>
          <WidgetBoundary name="DigitalHandover" title="Digital Handover">
            <DigitalHandover />
          </WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions">
            <QuickActions />
          </WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center">
            <NotificationCenter />
          </WidgetBoundary>
          <DevContactStrip />
        </div>
      </AuthGuard>
    </Suspense>
  );
}
