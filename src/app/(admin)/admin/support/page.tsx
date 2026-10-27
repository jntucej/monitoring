"use client";
<<<<<<< HEAD

export const dynamic = "force-dynamic";

import { AuthGuard } from "@/components/shared/AuthGuard";
=======
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { SupportDashboard } from "@/components/admin/SupportDashboard";

export default function AdminSupportPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <PageHeader
          title="Support Desk"
          subtitle="Tickets, escalation queue, and SLA tracking"
        />
        <WidgetBoundary title="Support Tickets">
          <SupportDashboard />
        </WidgetBoundary>
      </div>
    
    

  );
}
