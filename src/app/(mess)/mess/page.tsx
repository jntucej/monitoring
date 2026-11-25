"use client";

import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useApiResource } from "@/hooks/useApiResource";
import { KpiCard } from "@/components/shared/KpiCard";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { mealDayInspection } from "@/components/approver/wardenConsoleModels";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { LivePulseStrip } from "@/components/shared/LivePulseStrip";

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
      <ContextSituationBar
        roleLabel="Mess In-Charge"
        purpose="Direct daily dining service operations, verify meal tokens, and reconcile dining hall attendance"
        contextLabel={`Mess Operations Overview · ${mealDate}`}
        statusSummary={`${confirmed} meals confirmed served out of ${declared} declared present (${rate}% attendance rate).`}
        why="The overview aggregates real-time counter traffic, dietary splits, and serving percentages to keep meal service running smoothly."
        severity="info"
        primaryAction={{ label: "Token Scanner", href: "/mess/scan" }}
        secondaryActions={[
          { label: "Daily Meal Counts", href: "/mess/daily-meal-counts" },
          { label: "Menu Management", href: "/mess/menu-management" },
          { label: "Operational Requests", href: "/mess/operational-requests" },
        ]}
      />
      <LivePulseStrip
        ariaLabel="Mess service pulse"
        items={[
          {
            id: "served",
            label: "Meals Served",
            valueLabel: `${confirmed} / ${declared}`,
            ratio: declared > 0 ? confirmed / declared : 0,
            tone: rate >= 70 ? "ok" : rate >= 40 ? "warn" : "info",
            benchmark: `${rate}% of declared diners served`,
          },
          {
            id: "remaining",
            label: "Pending Diners",
            valueLabel: `${Math.max(0, declared - confirmed)}`,
            ratio: declared > 0 ? Math.max(0, declared - confirmed) / declared : 0,
            tone: declared - confirmed > 0 ? "warn" : "ok",
            benchmark: declared - confirmed > 0 ? "Tokens still awaiting scan" : "All declared diners served",
          },
          {
            id: "date",
            label: "Service Date",
            valueLabel: mealDate,
            tone: "info",
            benchmark: "Active dining window",
          },
        ]}
      />
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
