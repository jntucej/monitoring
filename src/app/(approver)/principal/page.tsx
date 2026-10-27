export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { Crown } from "lucide-react";
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

export default function PrincipalPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["principal"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Principal dashboard"
              icon={Crown}
              endpoint="/api/principal/dashboard"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                return [
                  { label: "Pending approvals", value: d.pendingApprovals ?? 0, tone: "warn" as const },
                  { label: "Recent alerts", value: Array.isArray(d.recentAlerts) ? d.recentAlerts.length : 0, tone: "danger" as const },
                  { label: "Campus occupancy", value: d.campusOccupancy ?? "—" },
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
