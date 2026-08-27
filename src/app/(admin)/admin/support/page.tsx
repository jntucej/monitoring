"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SupportDashboard } from "@/components/admin/SupportDashboard";

export default function AdminSupportPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <SupportDashboard />
      </div>
    </AuthGuard>
  );
}
