"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AnalyticsTab } from "@/components/mess/MessOperations";

export default function SysadminMessAnalyticsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Mess — Analytics" subtitle="Historical meal-day counts — declared vs confirmed vs no-show" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Mess Analytics">
          <AnalyticsTab />
        </WidgetBoundary>
      </Suspense>
      <DevContactStrip />
    </div>
  );
}
