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
          <OperatorWidgetBoundary name="RoleDashboardPanel" title="Worker Dashboard">
            <RoleDashboardPanel
              title="Worker dashboard"
              icon={HardHat}
              endpoint="/api/workers/my-work"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                const tasks = Array.isArray(d.tasks) ? d.tasks.length : 0;
                const todayShift = d.todayShift as Record<string, unknown> | undefined;
                return [
                  { label: "Assigned tasks", value: tasks, tone: tasks > 0 ? ("warn" as const) : ("ok" as const) },
                  { label: "Completed (week)", value: (d.completedLastWeek as number) ?? 0, tone: "ok" as const },
                  { label: "On shift", value: todayShift?.checkIn ? "Yes" : "No" },
                ];
              }}
            />
          </OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></OperatorWidgetBoundary>
          <OperatorWidgetBoundary name="OperatorNotifications" title="Operator Notifications"><OperatorNotifications /></OperatorWidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
