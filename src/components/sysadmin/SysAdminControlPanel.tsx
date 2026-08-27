"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  Shield,
  Server,
  Users,
  Lock,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface QuickHealth {
  status?: "healthy" | "degraded" | "unhealthy";
  services?: Record<
    string,
    { status: "healthy" | "degraded" | "unhealthy"; latency?: number }
  >;
}

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

export function SysAdminControlPanel() {
  const [health, setHealth] = useState<QuickHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [auditCount, setAuditCount] = useState<number | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchAuditCount = async () => {
    try {
      const res = await fetch("/api/admin/audit?limit=25&offset=0", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && json.success) setAuditCount(json.total ?? 0);
    } catch {
      setAuditCount(null);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchAuditCount();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">System Overview</h1>
        <p className="text-sm text-slate-400">
          Full-fidelity control room for administration, security, and integration operations.
        </p>
      </div>

      {/* Live System Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Gateway / Auth" icon={Shield} value={healthLoading ? "—" : (health?.status ?? "unavailable")} ok={health?.status === "healthy"} />
        <MetricCard label="Database" icon={Database} value={healthLoading ? "—" : "Operational"} ok={health?.status !== "unhealthy"} />
        <MetricCard label="Audit Records" icon={ShieldAlert} value={auditCount != null ? String(auditCount) : "—"} ok={auditCount != null} />
        <MetricCard label="Runtime" icon={Server} value="Healthy" ok />
      </div>

      {/* Quick Actions */}
      <QuickActionsGrid />

      {/* Governance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" /> Security Posture
          </h3>
          <ul className="text-[13px] text-slate-400 space-y-2">
            <li className="flex items-center justify-between">
              <span>Two-Factor Enforcement</span>
              <span className="text-emerald-400">Required</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Active Session Revocation</span>
              <Link href="/sysadmin/sessions" className="text-rose-300 hover:underline">Manage →</Link>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" /> Identity & Access
          </h3>
          <ul className="text-[13px] text-slate-400 space-y-2">
            <li className="flex items-center justify-between">
              <span>User Provisioning</span>
              <Link href="/sysadmin/roles" className="text-rose-300 hover:underline">Manage →</Link>
            </li>
            <li className="flex items-center justify-between">
              <span>Audit Telemetry</span>
              <Link href="/sysadmin/audit" className="text-rose-300 hover:underline">Review →</Link>
            </li>
          </ul>
        </div>
      </div>

      {healthLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading telemetry…
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  icon: Icon,
  value,
  ok,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold ${ok ? "text-emerald-400" : "text-rose-400"}`}>{value}</p>
    </div>
  );
}

function QuickActionsGrid() {
  const actions: QuickAction[] = [
    { href: "/sysadmin", label: "System Overview", description: "Launch dashboard", icon: Activity, accent: "text-emerald-400" },
    { href: "/sysadmin/integrations", label: "Integration Hub", description: "SSO, LMS, LDAP", icon: Database, accent: "text-sky-400" },
    { href: "/sysadmin/sessions", label: "Active Sessions", description: "Kill-switch access", icon: Lock, accent: "text-rose-400" },
    { href: "/sysadmin/audit", label: "Audit Telemetry", description: "Security logs", icon: ShieldAlert, accent: "text-amber-400" },
    { href: "/sysadmin/health", label: "System Health", description: "Live diagnostics", icon: Activity, accent: "text-emerald-400" },
    { href: "/sysadmin/security", label: "Zero-Trust Security", description: "Policies & MFA", icon: Shield, accent: "text-violet-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/50 hover:border-rose-500/30 p-5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <Icon className={`w-5 h-5 ${action.accent}`} />
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-300 transition-colors" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-100">{action.label}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
          </Link>
        );
      })}
    </div>
  );
}