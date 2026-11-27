"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { MealDaysTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminMessDaysPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Set the date, type, serving window and which menu items are on"
        why="Day and window changes immediately affect student token generation and gate scan eligibility."
        contextLabel="Set the date, type, serving window and which menu items are on"
        statusSummary="Review current set the date, type, serving window and which menu items are on state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
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
