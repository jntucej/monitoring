"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { MealDaysTab } from "@/components/mess/MessOperations";

export default function AdminMessDaysPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Mess — Meal Days" subtitle="Set the date, type, serving window and which menu items are on" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Meal Days">
          <MealDaysTab />
        </WidgetBoundary>
      </Suspense>
      <DevContactStrip />
    </div>
  );
}
