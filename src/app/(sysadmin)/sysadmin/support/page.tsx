"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SupportDashboard } from "@/components/admin/SupportDashboard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SysAdminSupportPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Tickets, escalation queue, and SLA tracking"
        why="Prioritize any overdue tickets here — they are visible to the students and staff who raised them."
        contextLabel="Tickets, escalation queue, and SLA tracking"
        statusSummary="Review current tickets, escalation queue, and sla tracking state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
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
