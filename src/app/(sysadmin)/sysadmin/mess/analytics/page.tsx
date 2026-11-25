"use client";

import { Suspense, lazy } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { AnalyticsTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const MessMonthlyReviewPanel = lazy(
  () => import("@/components/mess/MessMonthlyReviewPanel")
);

export default function SysadminMessAnalyticsPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Historical meal-day counts — declared vs confirmed vs no-show"
        why="Use these trends to audit vendor settlement and flag under- or over-provisioning."
        contextLabel="Historical meal-day counts — declared vs confirmed vs no-show"
        statusSummary="Review current historical meal-day counts — declared vs confirmed vs no-show state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
      <PageHeader title="Mess — Analytics" subtitle="Historical meal-day counts — declared vs confirmed vs no-show" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Mess Analytics">
          <AnalyticsTab />
        </WidgetBoundary>
      </Suspense>

      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Meal Review Aggregates">
          <MessMonthlyReviewPanel />
        </WidgetBoundary>
      </Suspense>
    </div>
  );
}
