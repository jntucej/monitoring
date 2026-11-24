"use client";
import { PredictiveAnalytics } from "@/components/admin/PredictiveAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function PredictiveAnalyticsPage() {
  return (
    
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Manage and monitor analytics predictive for campus operations."
        contextLabel="Analytics Predictive"
        statusSummary="Review current analytics predictive state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <PredictiveAnalytics />
      </div>
    
    

  );
}
