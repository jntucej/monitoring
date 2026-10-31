"use client";
import { Suspense } from "react";
import { Building2 } from "lucide-react";
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
import { AllocationPanel } from "@/components/approver/AllocationPanel";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PageHeader } from "@/components/shared/PageHeader";

export default function HostelManagerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["hostel_manager", "principal"]}>
        <div className="space-y-6">
          <PageHeader title="Hostel Manager" subtitle="Hostel operations & allocation" />
          <WidgetBoundary name="RoleDashboardPanel" title="Hostel Manager Dashboard">
            <RoleDashboardPanel
              title="Hostel Manager dashboard"
              icon={Building2}
              endpoint="/api/hostel-manager/summary"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                return [
                  { label: "Pending tickets", value: (d.pendingCount as number) ?? 0, tone: "warn" as const },
                  { label: "Assigned hostel", value: (d.assignedHostel as string) ?? "—" },
                ];
              }}
            />
          </WidgetBoundary>
          <KanbanBoard
            source="/api/hostel-manager/summary"
            itemKey="pendingTickets"
            columns={["PENDING", "ESCALATED", "APPROVED", "REJECTED"]}
            onSelect={() => {}}
          />
          <WidgetBoundary name="AllocationPanel" title="Room Allocation">
            <AllocationPanel />
          </WidgetBoundary>
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
          <DevContactStrip />
        </div>
      </AuthGuard>
    </Suspense>
  );
}
