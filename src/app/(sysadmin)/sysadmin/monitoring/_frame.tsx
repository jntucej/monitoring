"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { MonitoringHubNav } from "@/components/sysadmin/monitoring/MonitoringHubNav";

/**
 * Shared frame for /sysadmin/monitoring/* sub-pages: SysAdmin RBAC + the
 * situation bar + the section sub-nav + a titled content slot. Read-only.
 */
export function MonitoringSubPage({
  title,
  subtitle,
  contextLabel,
  children,
}: {
  title: string;
  subtitle: string;
  contextLabel: string;
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5">
        <ContextSituationBar
          roleLabel="System Admin"
          purpose="Central, read-only infrastructure observability."
          why="Use the matching section when a specific subsystem needs inspection."
          contextLabel={contextLabel}
          statusSummary="Read-only telemetry — no destructive actions."
          primaryAction={{ label: "Monitoring Hub", href: "/sysadmin/monitoring" }}
        />
        <div>
          <p className="text-2xl font-bold text-text-primary">{title}</p>
          <p className="text-xs text-text-muted mt-1">{subtitle}</p>
        </div>
        <MonitoringHubNav />
        {children}
      </div>
    </AuthGuard>
  );
}
