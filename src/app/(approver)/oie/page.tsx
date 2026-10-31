"use client";
import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleAnalytics } from "@/components/retention/RoleAnalytics";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function OiePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["oie"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary name="RoleDashboardPanel" title="OIE Dashboard">
            <RoleDashboardPanel
              title="OIE dashboard"
              icon={ClipboardCheck}
              endpoint="/api/oie/queue"
              mapKpis={(raw: unknown) => {
                const list = Array.isArray(raw) ? raw : [];
                return [
                  { label: "Queue length", value: list.length, tone: list.length > 0 ? ("warn" as const) : ("ok" as const) },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
