<<<<<<< HEAD
export const dynamic = "force-dynamic";

=======
"use client";

import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { SustainabilityDashboard } from "@/components/admin/SustainabilityDashboard";

export default function SustainabilityPage() {
  return (
    
      <div className="p-6 max-w-7xl mx-auto space-y-6">
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
