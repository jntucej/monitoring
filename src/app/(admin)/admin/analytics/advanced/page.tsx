"use client";
import { AdvancedAnalytics } from "@/components/admin/AdvancedAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdvancedAnalyticsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Manage and monitor analytics advanced for campus operations."
        contextLabel="Analytics Advanced"
        statusSummary="Review current analytics advanced state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <AdvancedAnalytics />
      </div>
    
    

  );
}
