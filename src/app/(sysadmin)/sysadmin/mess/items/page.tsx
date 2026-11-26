"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { MenuItemsTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SysadminMessItemsPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Items students can select as their primary or sub-item"
        why="Use this view to audit item costs and consumption before menu revisions."
        contextLabel="Items students can select as their primary or sub-item"
        statusSummary="Review current items students can select as their primary or sub-item state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
      <PageHeader title="Mess — Menu Items" subtitle="Items students can select as their primary or sub-item" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Menu Items">
          <MenuItemsTab />
        </WidgetBoundary>
      </Suspense>

    </div>
  );
}
