"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { DockerFleetPanel } from "@/components/sysadmin/monitoring/DockerFleetPanel";
import { Server } from "lucide-react";

export default function InfrastructurePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-rose-400" />
            Infrastructure Monitoring
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Read-only view of host, container, and service telemetry.
          </p>
        </div>

        <DockerFleetPanel />
      </div>
    </AuthGuard>
  );
}
