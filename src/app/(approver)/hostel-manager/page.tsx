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
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function HostelManagerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["hostel_manager", "principal"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Hostel Manager dashboard"
              icon={Building2}
              endpoint="/api/hostel-manager/summary"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                return [
                  { label: "Pending tickets", value: d.pendingCount ?? 0, tone: "warn" as const },
                  { label: "Assigned hostel", value: d.assignedHostel ?? "—" },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary><QuickActions /></WidgetBoundary>
          <WidgetBoundary><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
