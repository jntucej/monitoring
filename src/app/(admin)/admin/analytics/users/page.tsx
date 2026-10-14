"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { UserAnalytics } from "@/components/admin/UserAnalytics";

export default function UserAnalyticsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <UserAnalytics />
      </div>
    </AuthGuard>
  );
}
