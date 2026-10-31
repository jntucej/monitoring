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

export default function OperatorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["operator", "admin", "sysadmin"]}>
        <div className="space-y-6">
          <DevContactStrip />
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
        </div>
      </AuthGuard>
    </Suspense>
  );
}
