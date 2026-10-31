"use client";
import { Suspense } from "react";
import { Briefcase } from "lucide-react";
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
import { CampusKnowledgeCentre } from "@/components/retention/CampusKnowledgeCentre";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function StaffPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["staff"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary name="RoleDashboardPanel" title="Staff Dashboard">
            <RoleDashboardPanel
              title="Staff dashboard"
              icon={Briefcase}
              endpoint="/api/staff/my-day"
              mapKpis={(raw: unknown) => {
                const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
                const s = ((d.myDaySummary ?? d.assignedTasks) && typeof (d.myDaySummary ?? d.assignedTasks) === "object"
                  ? (d.myDaySummary ?? d.assignedTasks)
                  : {}) as Record<string, unknown>;
                const myRecent = Array.isArray(d.myRecent) ? d.myRecent : [];
                const openRequests = Array.isArray(d.openRequests) ? d.openRequests : [];
                const dutyRoster = Array.isArray(d.dutyRoster) ? d.dutyRoster : [];
                return [
                  { label: "Movements today", value: (s.movementsToday as number | undefined) ?? myRecent.length },
                  { label: "Open requests", value: (s.openRequestsCount as number | undefined) ?? openRequests.length, tone: "warn" as const },
                  { label: "On shift", value: (s.rosterOnShift as number | undefined) ?? dutyRoster.length },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary name="AttentionQueue" title="Attention Queue"><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home"><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary name="TaskContinuity" title="Task Continuity"><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar"><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary name="RoleAnalytics" title="Role Analytics"><RoleAnalytics /></WidgetBoundary>
          <WidgetBoundary name="CampusKnowledgeCentre" title="Campus Knowledge Centre"><CampusKnowledgeCentre /></WidgetBoundary>
          <WidgetBoundary name="CampusFeedbackDesk" title="Campus Feedback Desk"><CampusFeedbackDesk /></WidgetBoundary>
          <WidgetBoundary name="ActivityTimeline" title="Activity Timeline"><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary name="QuickActions" title="Quick Actions"><QuickActions /></WidgetBoundary>
          <WidgetBoundary name="NotificationCenter" title="Notification Center"><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
