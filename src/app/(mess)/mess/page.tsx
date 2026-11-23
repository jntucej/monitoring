"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { KpiCard } from "@/components/shared/KpiCard";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { mealDayInspection } from "@/components/approver/wardenConsoleModels";

import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";

interface MessAnalytics {
  declaredPresent: number;
  confirmedPresent: number;
  mealDate: string;
  mealType?: string;
}

function MessDashboardInner() {
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const { data } = useApiResource<{ data?: MessAnalytics } | MessAnalytics>(
    "/api/mess/analytics",
    { ttlMs: 30_000 },
  );

  const d = (data && typeof data === "object" && "data" in (data as { data?: unknown })
    ? (data as { data?: unknown }).data
    : data) as MessAnalytics | undefined;

  const declared = d?.declaredPresent ?? 0;
  const confirmed = d?.confirmedPresent ?? 0;
  const rate = declared > 0 ? Math.round((confirmed / declared) * 100) : 0;
  const mealDate = d?.mealDate ?? "—";

  const inspectMealDay = () => {
    inspect(
      mealDayInspection({
        messDayId: "today",
        mealDate,
        mealType: d?.mealType ?? "LUNCH",
        isActive: true,
        servedTotal: confirmed,
        viaToken: 0,
        viaManual: confirmed,
        veg: 0,
        nonVeg: 0,
        firstServedAt: null,
        lastServedAt: null,
      }),
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <WidgetBoundary name="MessDashboardKpis" title="Mess Incharge Dashboard">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Declared present"
            value={declared}
            tone={declared > 0 ? "neutral" : "warn"}
            onClick={inspectMealDay}
            hint="Today's declared attendance"
          />
          <KpiCard
            label="Confirmed present"
            value={confirmed}
            tone="ok"
            onClick={inspectMealDay}
            hint="Confirmed via token / manual"
          />
          <KpiCard
            label="Attendance rate"
            value={`${rate}%`}
            tone={rate >= 80 ? "ok" : rate >= 50 ? "warn" : "danger"}
            onClick={inspectMealDay}
            hint="Confirmed / declared"
          />
          <KpiCard
            label="Meal date"
            value={mealDate}
            tone="info"
            onClick={inspectMealDay}
            hint="Active mess day"
          />
        </div>
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
      <WidgetBoundary name="ActivityTimeline" title="Activity Timeline">
        <ActivityTimeline />
      </WidgetBoundary>
      <WidgetBoundary name="QuickActions" title="Quick Actions">
        <QuickActions />
      </WidgetBoundary>
      <WidgetBoundary name="NotificationCenter" title="Notification Center">
        <NotificationCenter />
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function MessPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["mess_incharge", "admin", "sysadmin"]}>
        <MessDashboardInner />
      </AuthGuard>
    </Suspense>
  );
}
