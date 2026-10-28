"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { MenuItemsTab } from "@/components/mess/MessOperations";

export default function AdminMessItemsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Mess — Menu Items" subtitle="Items students can select as their primary or sub-item" />
      <Suspense fallback={<PageLoading />}>
        <WidgetBoundary title="Menu Items">
          <MenuItemsTab />
        </WidgetBoundary>
      </Suspense>
      <DevContactStrip />
    </div>
  );
}
