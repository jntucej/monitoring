"use client";
import { Suspense } from "react";
import { Users } from "lucide-react";
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
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivityPanel } from "@/components/approver/ChildActivityPanel";
import { ChildWeeklyActivity } from "@/components/parent/ChildWeeklyActivity";
import { RequestPassForm } from "@/components/parent/RequestPassForm";

export default function ParentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["parent", "guardian"]}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <PageHeader title="Parent" subtitle="Your children\u2019 campus life" />
          <WidgetBoundary name="RoleDashboardPanel" title="Parent Dashboard">
            <RoleDashboardPanel
              title="Parent dashboard"
              icon={Users}
              endpoint="/api/parents/me"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                const children = Array.isArray(d.children) ? d.children.length : 0;
                return [
                  { label: "Children", value: children },
                  { label: "Open requests", value: (d.totalOpenRequests as number) ?? 0, tone: "warn" as const },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary name="ChildStatus" title="Child Status">
            <ChildStatus />
          </WidgetBoundary>
          <WidgetBoundary name="ChildActivityPanel" title="Child Activity">
            <ChildActivityPanel />
          </WidgetBoundary>
          <WidgetBoundary name="ChildWeeklyActivity" title="Weekly Activity">
            <ChildWeeklyActivity />
          </WidgetBoundary>
          <WidgetBoundary name="RequestPassForm" title="Request a Pass">
            <RequestPassForm />
          </WidgetBoundary>
                    <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
          <DevContactStrip />
        </div>
      </AuthGuard>
    </Suspense>
  );
}
