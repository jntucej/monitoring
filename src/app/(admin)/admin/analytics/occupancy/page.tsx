// src/app/(admin)/admin/analytics/occupancy/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the OccupancyAnalytics component.
"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { OccupancyAnalytics } from "@/components/admin/OccupancyAnalytics";

export default function OccupancyPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <OccupancyAnalytics />
    </AuthGuard>
  );
}
