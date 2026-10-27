export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { UtensilsCrossed } from "lucide-react";
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

export default function MessPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["mess_incharge", "admin", "sysadmin"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Mess Incharge dashboard"
              icon={UtensilsCrossed}
              endpoint="/api/mess/analytics"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                const declared = d.declaredPresent ?? 0;
                const confirmed = d.confirmedPresent ?? 0;
                const rate = declared > 0 ? Math.round((confirmed / declared) * 100) : 0;
                return [
                  { label: "Declared", value: declared },
                  { label: "Confirmed", value: confirmed, tone: "ok" as const },
                  { label: "Attendance", value: `${rate}%`, tone: rate >= 80 ? "ok" as const : rate >= 50 ? "warn" as const : "danger" as const },
                  { label: "Meal date", value: d.mealDate ?? "—" },
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
