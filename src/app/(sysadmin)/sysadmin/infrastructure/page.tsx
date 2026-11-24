"use client";


import { AuthGuard } from "@/components/shared/AuthGuard";
import { DockerFleetPanel } from "@/components/sysadmin/monitoring/DockerFleetPanel";
import { Server } from "lucide-react";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function InfrastructurePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor infrastructure for campus operations."
        contextLabel="Infrastructure"
        statusSummary="Review current infrastructure state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <div>
          <p className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-rose-400" />
            Infrastructure Monitoring
          </p>
          <p className="text-xs text-muted mt-1">
            Read-only view of host, container, and service telemetry.
          </p>
        </div>

        <DockerFleetPanel />
      </div>
    </AuthGuard>
  );
}
