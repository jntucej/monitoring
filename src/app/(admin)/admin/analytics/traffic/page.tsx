// src/app/(admin)/admin/analytics/traffic/page.tsx
// SCAFFOLD:PAGE — thin wrapper around the TrafficAnalytics component.
"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";

export default function TrafficPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <TrafficAnalytics />
    </AuthGuard>
  );
}
