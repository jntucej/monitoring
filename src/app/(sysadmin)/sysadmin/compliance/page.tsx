"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { ComplianceSettings } from "@/components/sysadmin/ComplianceSettings";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function CompliancePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor compliance for campus operations."
        contextLabel="Compliance"
        statusSummary="Review current compliance state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <ComplianceSettings />
      </div>
    </AuthGuard>
  );
}
