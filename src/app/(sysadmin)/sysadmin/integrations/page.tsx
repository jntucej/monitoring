"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { IntegrationsDashboard } from "@/components/sysadmin/IntegrationsDashboard";
import { LMSIntegration } from "@/components/sysadmin/LMSIntegration";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function IntegrationsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor integrations for campus operations."
        why="Disconnecting an integration here stops the corresponding background jobs until reconnected."
        contextLabel="Integrations"
        statusSummary="Review current integrations state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <LMSIntegration />
        <IntegrationsDashboard />
      </div>
    </AuthGuard>
  );
}
