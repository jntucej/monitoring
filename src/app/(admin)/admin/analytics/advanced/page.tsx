"use client";
import { AdvancedAnalytics } from "@/components/admin/AdvancedAnalytics";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function AdvancedAnalyticsPage() {
  return (
    
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Analyze high-dimensional campus transit patterns, anomalies, and multi-factor telemetry correlations."
        contextLabel="Advanced Analytics"
        why="Multi-dimensional telemetry analytics helps administration uncover subtle anomaly clusters and optimize facility resourcing."
        statusTone="info"
        statusPill="Telemetry Stream"
        statusSummary="Deep telemetry intelligence and cross-dimensional correlation models across campus operations."
        primaryAction={{ label: "Campus Analytics", href: "/admin/analytics" }}
        secondaryAction={{ label: "Predictive Models", href: "/admin/analytics/predictive" }}
      />
        <AdvancedAnalytics />
      </div>
    
    

  );
}
