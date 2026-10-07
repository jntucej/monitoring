"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { ComplianceSettings } from "@/components/sysadmin/ComplianceSettings";

export default function CompliancePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <ComplianceSettings />
      </div>
    </AuthGuard>
  );
}
