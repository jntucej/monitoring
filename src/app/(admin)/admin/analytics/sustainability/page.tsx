// src/app/(admin)/admin/analytics/sustainability/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the SustainabilityAnalytics component.
"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SustainabilityAnalytics } from "@/components/admin/SustainabilityAnalytics";

export default function SustainabilityPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <SustainabilityAnalytics />
    </AuthGuard>
  );
}
