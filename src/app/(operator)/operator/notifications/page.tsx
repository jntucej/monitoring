"use client";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

import { Suspense } from "react";
import { OperatorWidgetBoundary } from "@/components/operator/shared/OperatorWidgetBoundary";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";

import { OperatorNotifications } from "@/components/operator/shared/OperatorNotifications";

function OperatorNotificationsInner() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <ContextSituationBar
        roleLabel="Gate Operator"
        purpose="Real-time alert dispatch center for high-priority gate incidents, pass alerts, and system pings"
        contextLabel="Operator Notifications"
        statusSummary="Monitor real-time security alerts, curfew breach warnings, and hardware telemetry pings."
        primaryAction={{ label: "Announcements", href: "/operator/announcements" }}
        secondaryAction={{ label: "Exceptions Register", href: "/operator/exceptions" }}
      />
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-primary">Notifications</h2>
        <p className="text-xs text-muted mt-1 min-w-0">
          Alerts, approvals, and system messages relevant to your role.
        </p>
      </div>

      <OperatorWidgetBoundary title="">
        <OperatorNotifications compact={false} pollMs={30_000} />
      </OperatorWidgetBoundary>

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
