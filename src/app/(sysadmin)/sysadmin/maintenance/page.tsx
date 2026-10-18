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
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[var(--action-primary)]" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Maintenance</h1>
            <p className="text-xs text-[var(--text-muted)]">
              30-day windows · scheduled / in-progress · notifications
            </p>
          </div>
        </div>
        <MaintenanceContent />
      </div>
    </AuthGuard>
  );
}
