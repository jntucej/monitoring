"use client";

import { Suspense, useCallback } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { OperatorNotifications } from "@/components/operator/shared/OperatorNotifications";

function OperatorNotificationsInner() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Notifications</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
          Alerts, approvals, and system messages relevant to your role.
        </p>
      </div>

      <OperatorWidgetBoundary title="">
        <OperatorNotifications compact={false} pollMs={30_000} />
      </OperatorWidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OperatorNotificationsPage() {
  return (
    <Suspense fallback={<OperatorPageLoading />}>
      <OperatorNotificationsInner />
    </Suspense>
  );
}
