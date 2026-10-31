"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SupportDashboard } from "@/components/admin/SupportDashboard";

export default function SysAdminSupportPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <PageHeader
          title="Support Desk"
          subtitle="Tickets, escalation queue, and SLA tracking"
        />
        <WidgetBoundary title="Support Tickets">
          <SupportDashboard />
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
