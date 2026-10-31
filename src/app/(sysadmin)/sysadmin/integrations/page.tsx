"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { IntegrationsDashboard } from "@/components/sysadmin/IntegrationsDashboard";
import { LMSIntegration } from "@/components/sysadmin/LMSIntegration";

export default function IntegrationsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <LMSIntegration />
        <IntegrationsDashboard />
      </div>
    </AuthGuard>
  );
}
