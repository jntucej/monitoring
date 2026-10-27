import { Suspense } from "react";
import { ShieldAlert } from "lucide-react";
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

export default function SupervisorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["supervisor"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Supervisor dashboard"
              icon={ShieldAlert}
              endpoint="/api/supervisor/escalations"
              mapKpis={(raw: any) => {
                const c = raw?.counts ?? {};
                return [
                  { label: "Escalated", value: c.escalated ?? 0, tone: "warn" as const },
                  { label: "Active alerts", value: c.alerts ?? 0, tone: "danger" as const },
                  { label: "Recent decisions", value: c.decisions ?? 0, tone: "ok" as const },
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
