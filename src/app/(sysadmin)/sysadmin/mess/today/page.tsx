"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { TodayTab } from "@/components/mess/MessOperations";

export default function SysadminMessTodayPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Mess — Today" subtitle="Today's menu, token status, and serving counts" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Today's Mess">
          <TodayTab />
        </WidgetBoundary>
      </Suspense>
      <DevContactStrip />
    </div>
  );
}
