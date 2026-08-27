"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { HealthDashboard } from "@/components/sysadmin/HealthDashboard";

export default function SystemHealthPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="max-w-6xl mx-auto space-y-6">
        <HealthDashboard />
      </div>
    </AuthGuard>
  );
}
