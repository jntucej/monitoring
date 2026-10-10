"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  User,
  Shield,
  Server,
  User,
  Users,
  Lock,
  ShieldAlert,
  ArrowRight,
  Loader2,
  RefreshCw,
  Clock,
  Landmark,
  Sparkles,
  DoorOpen,
  Bell,
  Layout,
  UserCheck,
  GraduationCap,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { GovernanceModules } from "./SysAdminGovernanceModules";
import { HealthDashboard } from "./HealthDashboard";
import { getAuthHeaders } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  details: Record<string, any>;
}

export function SysAdminControlPanel() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    setIsSyncing(true);
    try {
      const headers = getAuthHeaders();

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
        }
      }

      // Fetch Active Sessions Count
      const sessRes = await fetch("/api/admin/sessions", {
        headers,
        cache: "no-store",
      }).catch(() => null);
      if (sessRes && sessRes.ok) {
        const sessJson = await sessRes.json();
        if (sessJson.success && Array.isArray(sessJson.data)) {
          setSessionCount(sessJson.data.length);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30_000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-rose-400" />
            System Control Room
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Dedicated infrastructure, security governance, SSO/LDAP integrations & telemetry console.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/sysadmin/profile"
            className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            SysAdmin Profile
          </Link>
          <button
            onClick={fetchTelemetry}
            disabled={isSyncing}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Refreshing..." : "Sync Telemetry"}
          </button>
        </div>
      </div>

      {/* System Health & Telemetry Dashboard */}
      <HealthDashboard />

      {/* Governance Control Modules */}
      <GovernanceModules />

      {/* Live System Audit Stream */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Live System Audit Telemetry Stream</h3>
          </div>
          <Link
            href="/sysadmin/audit"
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
          >
            View Full Audit Trail <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--text-primary)]">
            <thead className="bg-[var(--bg-elevated)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">
              <tr>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">User / Executed By</th>
                <th className="py-2.5 px-3">Sys Tag & Location (Admin Only)</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-mono">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => {
                  const details = log.details || {};
                  const sysTag = details.sysTag || "SYS_TAG_VERIFIED";
                  const geo = details.geo;
                  const gpsText = geo && geo.latitude ? `${geo.latitude}, ${geo.longitude}` : "GPS N/A";
                  return (
                    <tr key={log.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-rose-400">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-primary)]">
                        {log.user_name || "System Core"} ({log.user_role || "system"})
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 w-fit">
                            {sysTag}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            📍 {gpsText}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)] text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--text-muted)] font-sans">
                    No recent audit logs available or initializing...
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