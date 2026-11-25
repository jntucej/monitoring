"use client";

// src/app/(sysadmin)/sysadmin/deployments/page.tsx
// DEPLOYMENTS — kind timeline, pollMs 60000, automation category.
// Thin wrapper: all logic lives in DeploymentsContent (useDashboardData inside).

import { AuthGuard } from "@/components/shared/AuthGuard";
import { DeploymentsContent } from "@/components/sysadmin/domains/automation/DeploymentsContent";
import { GitBranch } from "lucide-react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function DeploymentsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        contextLabel="Deployment Telemetry & Release History"
        purpose="Track release pipeline history, inspect automated health gates, measure lead times, and monitor active container commits."
        statusSummary="Deployment history and release gate metrics streaming live from container automation logs."
        why="Auditing release versions and automated health gates ensures rapid rollback capability when faulty builds reach production."
        primaryAction={{ label: "Docker Services", href: "/sysadmin/docker-services" }}
        secondaryAction={{ label: "Autonomous Monitoring", href: "/sysadmin/autonomous" }}
      />
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-action-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Deployments</h1>
            <p className="text-xs text-text-muted">
              Release history · health gate · rollbacks · lead time
            </p>
          </div>
        </div>
        <DeploymentsContent />
      </div>
    </AuthGuard>
  );
}
