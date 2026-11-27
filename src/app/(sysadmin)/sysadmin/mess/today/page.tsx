"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { TodayTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SysadminMessTodayPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Today's menu, token status, and serving counts"
        why="Use this view to cross-check student-facing data before mess operations closes for the day."
        contextLabel="Today's menu, token status, and serving counts"
        statusSummary="Review current today's menu, token status, and serving counts state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
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
