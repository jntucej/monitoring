"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { HealthDashboard } from "@/components/sysadmin/HealthDashboard";

export default function SysAdminHealthPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <HealthDashboard />
      </div>
    </AuthGuard>
  );
}
