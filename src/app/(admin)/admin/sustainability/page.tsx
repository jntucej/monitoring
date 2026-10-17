"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { SustainabilityDashboard } from "@/components/admin/SustainabilityDashboard";

export default function SustainabilityPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Sustainability"
          subtitle="Energy, water, and carbon-footprint tracking"
        />
        <WidgetBoundary title="Sustainability">
          <SustainabilityDashboard />
        </WidgetBoundary>
      </div>
    </AuthGuard>
  );
}
