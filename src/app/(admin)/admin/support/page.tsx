"use client";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { SupportDashboard } from "@/components/admin/SupportDashboard";

export default function AdminSupportPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <WidgetBoundary title="Support Tickets">
          <SupportDashboard />
        </WidgetBoundary>
      </div>
    
    

  );
}
