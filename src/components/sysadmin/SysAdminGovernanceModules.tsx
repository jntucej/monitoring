"use client";

import Link from "next/link";
import { Users, Lock, Database, Bell, ArrowRight } from "lucide-react";

export function GovernanceModules() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
        System Governance Control Modules
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModuleCard
          title="Identity & Access"
          icon={Users}
          color="text-sky-400"
          bgColor="bg-sky-500/10"
          borderColor="hover:border-sky-500/40"
          links={[
            { label: "SysAdmin Profile & Credentials", href: "/sysadmin/profile" },
            { label: "Manage Students Roster", href: "/sysadmin/students" },
            { label: "Manage Staff Roster", href: "/sysadmin/staff" },
            { label: "Roles & Permissions", href: "/sysadmin/roles" },
            { label: "Role Elevation Requests", href: "/sysadmin/promotions" },
          ]}
        />

        <ModuleCard
          title="Zero-Trust & Security"
          icon={Lock}
          color="text-rose-400"
          bgColor="bg-rose-500/10"
          borderColor="hover:border-rose-500/40"
          links={[
            { label: "Zero-Trust Policies", href: "/sysadmin/security" },
            { label: "Active User Sessions", href: "/sysadmin/sessions" },
            { label: "Audit Telemetry", href: "/sysadmin/audit" },
            { label: "Compliance & Archival", href: "/sysadmin/compliance" },
          ]}
        />

        <ModuleCard
          title="Integrations & Jobs"
          icon={Database}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
          borderColor="hover:border-emerald-500/40"
          links={[
            { label: "SSO & SAML Config", href: "/sysadmin/sso" },
            { label: "Integration Hub (LDAP/LMS)", href: "/sysadmin/integrations" },
            { label: "Scheduled Jobs Engine", href: "/sysadmin/jobs" },
            { label: "Smart Shift Scheduling", href: "/sysadmin/scheduling" },
          ]}
        />

        <ModuleCard
          title="System Policy Configs"
          icon={Bell}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          borderColor="hover:border-amber-500/40"
          links={[
            { label: "Alert Anomaly Rules", href: "/sysadmin/alerts/rules" },
            { label: "Exit Reasons Desk", href: "/sysadmin/exit-reasons" },
            { label: "Dynamic Navigation Editor", href: "/sysadmin/navigation" },
            { label: "System Health Diagnostics", href: "/sysadmin/health" },
          ]}
        />
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  links,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0d1220] p-5 shadow-lg flex flex-col justify-between transition-all ${borderColor}`}>
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl ${bgColor} ${color} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
        </div>
        <div className="space-y-1.5 text-xs font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors group"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}