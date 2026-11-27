"use client";

import { Activity } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { MonitoringHubNav } from "@/components/sysadmin/monitoring/MonitoringHubNav";
import { SystemHealthPanel } from "@/components/sysadmin/monitoring/SystemHealthPanel";
import { ObservabilityStackPanel } from "@/components/sysadmin/monitoring/ObservabilityStackPanel";
import { DualThroughputCurve } from "@/components/sysadmin/kit/viz";

/**
 * /sysadmin/monitoring — the central infrastructure observability hub.
 * Read-only: host system health + observability stack + API throughput.
 * SysAdmin RBAC via AuthGuard. No destructive actions.
 */
export default function MonitoringHubPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5">
        <ContextSituationBar
          roleLabel="System Admin"
          purpose="Central, read-only view of infrastructure health without touching the server terminal."
          why="Use this first when a service-level alert fires — see host, container, database, and log state in one place."
          contextLabel="Infrastructure Monitoring"
          statusSummary="Live host, container, and observability telemetry."
          primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
          secondaryAction={{ label: "Docker Services", href: "/sysadmin/docker-services" }}
        />

        <div>
          <p className="text-2xl font-bold flex items-center gap-2 text-text-primary">
            <Activity className="w-6 h-6 text-action-success" />
            Infrastructure Monitoring
          </p>
          <p className="text-xs text-text-muted mt-1">
            Read-only telemetry · system health, containers, database, logs, and Grafana.
          </p>
        </div>

        <MonitoringHubNav />

        <SystemHealthPanel />

        <DualThroughputCurve />

        <ObservabilityStackPanel />
      </div>
    </AuthGuard>
  );
}
