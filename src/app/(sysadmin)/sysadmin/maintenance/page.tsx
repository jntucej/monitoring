"use client";

// src/app/(sysadmin)/sysadmin/maintenance/page.tsx
// MAINTENANCE — kind calendar, pollMs 60000, automation category.
// Thin wrapper: all logic lives in MaintenanceContent (useDashboardData inside).

import { AuthGuard } from "@/components/shared/AuthGuard";
import { MaintenanceContent } from "@/components/sysadmin/domains/automation/MaintenanceContent";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-action-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Maintenance</h1>
            <p className="text-xs text-text-muted">
              30-day windows · scheduled / in-progress · notifications
            </p>
          </div>
        </div>
        <MaintenanceContent />
      </div>
    </AuthGuard>
  );
}
