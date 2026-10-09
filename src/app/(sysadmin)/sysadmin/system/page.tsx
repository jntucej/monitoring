"use client";

import Link from "next/link";
import { Activity, Clock, Database, Sparkles, Layout, ArrowUpRight } from "lucide-react";

export default function SystemHubPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">System Operations & Integrations</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Monitor service uptime, background job schedulers, webhooks, and UI navigation hierarchies.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/sysadmin/health"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-40"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Activity className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">System Health & Telemetry</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Postgres pool, Auth, Redis cache latencies</p>
          </div>
        </Link>

        <Link
          href="/sysadmin/jobs"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-40"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Scheduled Cron Jobs</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Nightly curfews, auto-archiving, cleanup</p>
          </div>
        </Link>

        <Link
          href="/sysadmin/integrations"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-40"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
              <Database className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Integration Hub</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">ERP connectors, biometric sync, webhooks</p>
          </div>
        </Link>

        <Link
          href="/sysadmin/scheduling"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-40"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Smart Shift Scheduling</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">AI operator rostering & coverage rules</p>
          </div>
        </Link>

        <Link
          href="/sysadmin/navigation"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-40"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-sky-500/10 text-sky-500">
              <Layout className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Navigation Menu Editor</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Customize role menus & sidebar hierarchies</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
