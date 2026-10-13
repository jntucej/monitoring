"use client";

export const dynamic = "force-dynamic";

import { AuditLogViewer } from "@/components/sysadmin/AuditLogViewer";

export default function SysadminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Audit Telemetry & Security Logs</p>
        <p className="text-sm text-[var(--text-muted)]">
          Real-time tracking of security operations, system configurations, and administrative actions.
        </p>
      </div>

      <AuditLogViewer />
    </div>
  );
}
