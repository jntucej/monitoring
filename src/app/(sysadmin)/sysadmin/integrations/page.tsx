"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { IntegrationsDashboard } from "@/components/sysadmin/IntegrationsDashboard";
import { LMSIntegration } from "@/components/sysadmin/LMSIntegration";

export default function IntegrationsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <LMSIntegration />
        <IntegrationsDashboard />
      </div>
    </AuthGuard>
  );
}
