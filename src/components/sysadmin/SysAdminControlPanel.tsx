"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {User, ShieldAlert, ArrowRight, AlertCircle}  from "lucide-react";
import { GovernanceModules } from "./SysAdminGovernanceModules";
import { HealthDashboard } from "./HealthDashboard";
import { DevMessagesPanel } from "@/components/admin/DevMessagesPanel";

import { useApi } from "@/hooks/useApi";

interface AuditLog {
  id: string;
  action: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  details: Record<string, any>;
}

export function SysAdminControlPanel() {
const api = useApi();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [_auditCount, setAuditCount] = useState<number | null>(null);
  const [_sessionCount, setSessionCount] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [telemetryError, setTelemetryError] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    setIsSyncing(true);
    setTelemetryError(false);
    try {
      const headers = api.getHeaders();
      let auditOk = false;

      // Fetch Recent Audit Logs & Count
      const auditRes = await fetch("/api/admin/audit?limit=8&offset=0", {
        headers,
        cache: "no-store",
      }).catch(() => null);
      if (auditRes && auditRes.ok) {
        const auditJson = await auditRes.json();
        if (auditJson.success) {
          setAuditLogs(auditJson.data || []);
          setAuditCount(auditJson.total ?? 0);
          auditOk = true;
        }
      }

      // Fetch Active Sessions Count
      let sessionsOk = false;
      const sessRes = await fetch("/api/admin/sessions", {
        headers,
        cache: "no-store",
      }).catch(() => null);
      if (sessRes && sessRes.ok) {
        const sessJson = await sessRes.json();
        if (sessJson.success && Array.isArray(sessJson.data)) {
          setSessionCount(sessJson.data.length);
          sessionsOk = true;
        }
      }

      if (!auditOk || !sessionsOk) {
        setTelemetryError(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-text-muted">
            Dedicated infrastructure, security governance, SSO/LDAP integrations & telemetry console.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/sysadmin/profile"
            className="surface-card px-3.5 py-1.5 bg-bg-surface text-xs font-semibold text-text-primary hover:bg-bg-elevated transition-all flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-action-info" />
            SysAdmin Profile
          </Link>
        </div>
      </div>

      {/* System Health & Telemetry Dashboard */}
      <HealthDashboard />

      {/* Incoming developer messages (direct-to-dev channel from all users) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">

        <DevMessagesPanel />
      </div>

      {/* Governance Control Modules */}
      <GovernanceModules />

      {/* Live System Audit Stream */}
      <div className="surface-card bg-bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-action-warning" />
            <h3 className="text-sm font-bold text-text-primary">Live System Audit Telemetry Stream</h3>
          </div>
          <Link
            href="/sysadmin/audit"
            className="text-xs text-action-danger hover:text-action-danger font-semibold flex items-center gap-1"
          >
            View Full Audit Trail <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {telemetryError && (
          <div className="surface-card flex items-center justify-between gap-3 p-3 bg-rose-500/10">
            <div className="flex items-center gap-2 text-xs text-action-danger font-medium">
              <AlertCircle className="w-4 h-4 text-action-danger shrink-0" />
              <span>Could not load telemetry. Audit or session endpoints unavailable.</span>
            </div>
            <button
              onClick={fetchTelemetry}
              disabled={isSyncing}
              className="surface-card px-2.5 py-1 bg-rose-500/20 text-action-danger text-xs font-bold hover:bg-rose-500/30 transition disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead className="bg-bg-elevated text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">User / Executed By</th>
                <th className="py-2.5 px-3">Sys Tag &amp; Location (Admin Only)</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => {
                  const details = log.details || {};
                  const sysTag = details.sysTag || "SYS_TAG_VERIFIED";
                  const geo = details.geo;
                  const gpsText = geo && geo.latitude ? `${geo.latitude}, ${geo.longitude}` : "GPS N/A";
                  return (
                    <tr key={log.id} className="hover:bg-bg-elevated/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-action-danger">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-text-primary">
                        {log.user_name || "System Core"} ({log.user_role || "system"})
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="surface-card px-2 py-0.5 text-xs font-bold bg-indigo-500/20 text-action-primary w-fit">
                            {sysTag}
                          </span>
                          <span className="text-xs text-action-success font-mono">
                            📍 {gpsText}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-text-muted text-xs">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-text-muted font-sans">
                    {telemetryError ? "Telemetry unavailable — see banner above." : "No recent audit logs available or initializing..."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}