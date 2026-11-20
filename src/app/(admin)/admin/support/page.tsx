"use client";
import { Suspense, lazy } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SupportDashboard } from "@/components/admin/SupportDashboard";

const ComplaintMonthlyReviewPanel = lazy(
  () => import("@/components/complaints/ComplaintMonthlyReviewPanel")
);

export default function AdminSupportPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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
