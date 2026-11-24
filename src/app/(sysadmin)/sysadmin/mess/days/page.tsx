"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { MealDaysTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SysadminMessDaysPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Set the date, type, serving window and which menu items are on"
        contextLabel="Set the date, type, serving window and which menu items are on"
        statusSummary="Review current set the date, type, serving window and which menu items are on state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
      <PageHeader title="Mess — Meal Days" subtitle="Set the date, type, serving window and which menu items are on" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Meal Days">
          <MealDaysTab />
        </WidgetBoundary>
      </Suspense>

    </div>
  );
}
