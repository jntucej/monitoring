"use client";

// src/app/(sysadmin)/sysadmin/deployments/page.tsx
// DEPLOYMENTS — kind timeline, pollMs 60000, automation category.
// Thin wrapper: all logic lives in DeploymentsContent (useDashboardData inside).

import { AuthGuard } from "@/components/shared/AuthGuard";
import { DeploymentsContent } from "@/components/sysadmin/domains/automation/DeploymentsContent";
import { GitBranch } from "lucide-react";

export default function DeploymentsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[var(--action-primary)]" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Deployments</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Release history · health gate · rollbacks · lead time
            </p>
          </div>
        </div>
        <DeploymentsContent />
      </div>
    </AuthGuard>
  );
}
