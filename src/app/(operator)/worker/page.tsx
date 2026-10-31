"use client";
import { Suspense } from "react";
import { HardHat } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { OperatorNotifications } from "@/components/operator/shared/OperatorNotifications";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function WorkerPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <AuthGuard allowedRoles={["worker"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <OperatorWidgetBoundary>
            <RoleDashboardPanel
              title="Worker dashboard"
              icon={HardHat}
              endpoint="/api/workers/my-work"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                const tasks = Array.isArray(d.tasks) ? d.tasks.length : 0;
                return [
                  { label: "Assigned tasks", value: tasks, tone: tasks > 0 ? "warn" as const : "ok" as const },
                  { label: "Completed (week)", value: d.completedLastWeek ?? 0, tone: "ok" as const },
                  { label: "On shift", value: d.todayShift?.checkIn ? "Yes" : "No" },
                ];
              }}
            />
          </OperatorWidgetBoundary>
          <OperatorWidgetBoundary><AttentionQueue /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary><PersonalizedCampusHome /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary><TaskContinuity /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary><UnifiedCampusCalendar /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary><ActivityTimeline /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary><QuickActions /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary><OperatorNotifications /></OperatorWidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
