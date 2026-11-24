"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { AnalyticsTab } from "@/components/mess/MessOperations";
import { MessExclusionTrend } from "@/components/mess/MessExclusionTrend";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminMessAnalyticsPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Historical meal-day counts — declared vs confirmed vs no-show"
        contextLabel="Historical meal-day counts — declared vs confirmed vs no-show"
        statusSummary="Review current historical meal-day counts — declared vs confirmed vs no-show state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <PageHeader title="Mess — Analytics" subtitle="Historical meal-day counts — declared vs confirmed vs no-show" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Mess Analytics">
          <AnalyticsTab />
        </WidgetBoundary>
        <MessExclusionTrend />
      </Suspense>

    </div>
  );
}
