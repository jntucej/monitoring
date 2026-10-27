"use client";

import { Suspense } from "react";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
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
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Alerts, approvals and campus notices for your wards
        </p>
      </div>

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
