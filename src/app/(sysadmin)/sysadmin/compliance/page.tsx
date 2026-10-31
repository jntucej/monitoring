"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { ComplianceSettings } from "@/components/sysadmin/ComplianceSettings";

export default function CompliancePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <ComplianceSettings />
      </div>
    </AuthGuard>
  );
}
