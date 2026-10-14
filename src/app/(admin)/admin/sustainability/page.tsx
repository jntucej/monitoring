"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SustainabilityDashboard } from "@/components/admin/SustainabilityDashboard";

export default function SustainabilityPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <SustainabilityDashboard />
      </div>
    </AuthGuard>
  );
}
