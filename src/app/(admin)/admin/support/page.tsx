"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { SupportDashboard } from "@/components/admin/SupportDashboard";

export default function AdminSupportPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <WidgetBoundary title="Support Tickets">
          <SupportDashboard />
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
