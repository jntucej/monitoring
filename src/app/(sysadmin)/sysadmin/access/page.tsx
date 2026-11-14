"use client";


import Link from "next/link";
import { UserCheck, Lock, Users, ArrowUpRight } from "lucide-react";

export default function AccessHubPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-2xl font-bold tracking-tight text-text-primary">Access & Identity Governance</p>
        <p className="text-sm text-text-secondary mt-1">
          Manage roles, live session terminations, and role promotions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/sysadmin/roles"
          className="surface-card p-5 bg-bg-base hover: (--primary)] transition group flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="surface-card p-3 bg-blue-500/10 text-action-primary">
              <UserCheck className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-text-muted group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-text-primary">Role & Permission Matrix</h3>
            <p className="text-xs text-text-secondary mt-1">
              Configure fine-grained access control across sysadmin, admin, principal, operator, faculty, and student roles.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/sessions"
          className="surface-card p-5 bg-bg-base hover: (--primary)] transition group flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="surface-card p-3 bg-amber-500/10 text-action-warning">
              <Lock className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-text-muted group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-text-primary">Active Sessions Monitor</h3>
            <p className="text-xs text-text-secondary mt-1">
              Inspect active bearer tokens, device metadata, IPs, and trigger instant 1-click global revocation.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/promotions"
          className="surface-card p-5 bg-bg-base hover: (--primary)] transition group flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="surface-card p-3 bg-emerald-500/10 text-action-success">
              <Users className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-text-muted group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-text-primary">Academic Batch Promotions</h3>
            <p className="text-xs text-text-secondary mt-1">
              Execute semester & year-level cohort promotions, graduate archiving, and section updates in bulk.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
