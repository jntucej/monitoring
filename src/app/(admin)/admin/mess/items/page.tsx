"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";

import { MenuItemsTab } from "@/components/mess/MessOperations";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdminMessItemsPage() {
  return (
    <div className="space-y-5">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Items students can select as their primary or sub-item"
        contextLabel="Items students can select as their primary or sub-item"
        statusSummary="Review current items students can select as their primary or sub-item state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
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
