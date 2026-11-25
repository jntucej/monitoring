"use client";

import { Suspense } from "react";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import {
  Bell
} from "lucide-react";

function NotificationsInner() {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-emerald-400" />
          Notifications
        </p>
        <p className="mt-1 text-sm text-muted">
          Alerts, approvals and campus notices for your wards
        </p>
      </div>

      <ContextSituationBar
        roleLabel="Student Guardian / Parent"
        purpose="Monitor critical alerts, pass approval milestones, and emergency campus bulletins."
        why="Guardian alerts keep parents immediately informed of unauthorized late returns, curfew warnings, or leave approvals."
        contextLabel="Guardian Alert Center"
        statusTone="info"
        statusSummary="Stay notified of gate scan events, pass decision updates, and institutional broadcasts for your wards."
        primaryAction={{ label: "Ward Status", href: "/guardian/child-status" }}
        secondaryAction={{ label: "Request Status", href: "/guardian/request-status" }}
      />

      {/* NotificationCenter is already wrapped in its own WidgetBoundary;
          wrap the outer page in one too so the whole section degrades
          gracefully. */}
      <WidgetBoundary title="Notifications">
        <NotificationCenter compact pollMs={30_000} />
      </WidgetBoundary>
    </div>
  );
}
export default function NotificationsPage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <NotificationsInner />
      </Suspense>
    </AuthGuard>
  );
}
