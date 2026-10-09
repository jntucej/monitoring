"use client";

import Link from "next/link";
import { UserCheck, Lock, Landmark, Users, ArrowUpRight, ShieldCheck } from "lucide-react";

export default function AccessHubPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Access & Identity Governance</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage roles, live session terminations, SSO authentication providers, and role promotions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/sysadmin/roles"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
              <UserCheck className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--text-primary)]">Role & Permission Matrix</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Configure fine-grained access control across sysadmin, admin, warden, operator, faculty, and student roles.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/sessions"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
              <Lock className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--text-primary)]">Active Sessions Monitor</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Inspect active bearer tokens, device metadata, IPs, and trigger instant 1-click global revocation.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/sso"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
              <Landmark className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--text-primary)]">Single Sign-On (SSO)</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Manage SAML 2.0 / OAuth2 identity providers (Google Workspace, Microsoft Entra, Okta) and domain filters.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/promotions"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Users className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[var(--text-primary)]">Academic Batch Promotions</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Execute semester & year-level cohort promotions, graduate archiving, and section updates in bulk.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
