"use client";
import { Suspense, lazy } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SupportDashboard } from "@/components/admin/SupportDashboard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

const ComplaintMonthlyReviewPanel = lazy(
  () => import("@/components/complaints/ComplaintMonthlyReviewPanel")
);

export default function AdminSupportPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Tickets, escalation queue, and SLA tracking"
        why="Every ticket here carries its resolution SLA — prioritize overdue items to avoid escalation."
        contextLabel="Tickets, escalation queue, and SLA tracking"
        statusSummary="Review current tickets, escalation queue, and sla tracking state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <PageHeader
          title="Support Desk"
          subtitle="Tickets, escalation queue, and SLA tracking"
        />
        <WidgetBoundary title="Support Tickets">
          <SupportDashboard />
        </WidgetBoundary>
        <Suspense fallback={null}>
          <ComplaintMonthlyReviewPanel />
        </Suspense>
      </div>
    
    

  );
}
