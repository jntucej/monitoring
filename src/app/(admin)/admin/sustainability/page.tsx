"use client";

import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { SustainabilityDashboard } from "@/components/admin/SustainabilityDashboard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SustainabilityPage() {
  return (
    
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Energy, water, and carbon-footprint tracking"
        contextLabel="Energy, water, and carbon-footprint tracking"
        statusSummary="Review current energy, water, and carbon-footprint tracking state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
        <PageHeader
          title="Sustainability"
          subtitle="Energy, water, and carbon-footprint tracking"
        />
        <WidgetBoundary title="Sustainability">
          <SustainabilityDashboard />
        </WidgetBoundary>
      </div>
    
    

  );
}
