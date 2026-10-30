import { Suspense } from "react";
import { Crown } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PrincipalLoading } from "@/components/principal/shared/PrincipalLoading";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { PrincipalNotifications } from "@/components/principal/shared/PrincipalNotifications";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function PrincipalPage() {
  return (
    <Suspense fallback={<PrincipalLoading />}>
      <AuthGuard allowedRoles={["principal"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <PrincipalWidgetBoundary>
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
          </PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><AttentionQueue /></PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><PersonalizedCampusHome /></PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><TaskContinuity /></PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><UnifiedCampusCalendar /></PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><ActivityTimeline /></PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><QuickActions /></PrincipalWidgetBoundary>
          <PrincipalWidgetBoundary><PrincipalNotifications /></PrincipalWidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
