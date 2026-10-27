export const dynamic = "force-dynamic";
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

export default function ParentPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["parent", "guardian"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Parent dashboard"
              icon={Users}
              endpoint="/api/parents/me"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                const children = Array.isArray(d.children) ? d.children.length : 0;
                return [
                  { label: "Children", value: children },
                  { label: "Open requests", value: d.totalOpenRequests ?? 0, tone: "warn" as const },
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
