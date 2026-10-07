"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { PromotionRequests } from "@/components/sysadmin/PromotionRequests";

export default function RolePromotionsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin", "faculty"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <PromotionRequests />
      </div>
    </AuthGuard>
  );
}

