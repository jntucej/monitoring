"use client";

import { AuditLogViewer } from "@/components/sysadmin/AuditLogViewer";

export default function SysadminAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Telemetry & Security Logs</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Real-time tracking of security operations, system configurations, and administrative actions.
        </p>
      </div>

      <AuditLogViewer />
    </div>
  );
}
