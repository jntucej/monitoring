"use client";

import { Suspense, lazy } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { AnalyticsTab } from "@/components/mess/MessOperations";

const MessMonthlyReviewPanel = lazy(
  () => import("@/components/mess/MessMonthlyReviewPanel")
);

export default function SysadminMessAnalyticsPage() {
  return (
    <div className="space-y-5">
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
