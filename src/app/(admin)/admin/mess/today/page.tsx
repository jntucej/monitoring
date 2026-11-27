"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { TodayTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminMessTodayPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Today's menu, token status, and serving counts"
        why="Use this view to spot shortages early and rebalance meal distribution before cutoff."
        contextLabel="Today's menu, token status, and serving counts"
        statusSummary="Review current today's menu, token status, and serving counts state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <PageHeader title="Mess — Today" subtitle="Today's menu, token status, and serving counts" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Today's Mess">
          <TodayTab />
        </WidgetBoundary>
      </Suspense>

    </div>
  );
}
