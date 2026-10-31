"use client";

import { Suspense } from "react";
import { Wrench } from "lucide-react";
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
import { GridBoard } from "@/components/shared/GridBoard";

export default function CaretakerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["caretaker", "admin", "sysadmin"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary name="RoleDashboardPanel" title="Caretaker Dashboard">
            <RoleDashboardPanel
              title="Caretaker dashboard"
              icon={Wrench}
              endpoint="/api/caretaker/summary"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                const occupancyVal = typeof d.occupancy === "number" ? d.occupancy : "—";
                return [
                  {
                    label: "Pending tickets",
                    value: (d.pendingCount as number) ?? 0,
                    tone: ((d.pendingCount as number) ?? 0) > 0 ? ("warn" as const) : ("ok" as const),
                  },
                  { label: "Assigned hostel", value: (d.assignedHostel as string) ?? "—" },
                  { label: "Campus occupancy", value: occupancyVal },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary name="AttentionQueue" title="Attention Queue">
            <AttentionQueue />
          </WidgetBoundary>
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
            <PersonalizedCampusHome />
          </WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity">
            <TaskContinuity />
          </WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
            <UnifiedCampusCalendar />
          </WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics">
            <RoleAnalytics />
          </WidgetBoundary>
          <WidgetBoundary name="GridBoard" title="Maintenance Tasks">
            <GridBoard
              source="/api/caretaker/summary"
              groupBy="status"
              columns={["Open", "In Progress", "Resolved"]}
            />
          </WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline">
            <ActivityTimeline />
          </WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions">
            <QuickActions />
          </WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center">
            <NotificationCenter />
          </WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
