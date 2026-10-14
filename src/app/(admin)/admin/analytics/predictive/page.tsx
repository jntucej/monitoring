"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PredictiveAnalytics } from "@/components/admin/PredictiveAnalytics";

export default function PredictiveAnalyticsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PredictiveAnalytics />
      </div>
    </AuthGuard>
  );
}
