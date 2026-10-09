"use client";

import Link from "next/link";
import { ShieldCheck, Bell, DoorOpen, ShieldAlert, ArrowUpRight, AlertOctagon } from "lucide-react";

export default function SafetyHubPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Safety & Security Control</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Zero-trust gate enforcement, real-time alert rules, perimeter lockdown, and standardized exit codes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/sysadmin/security"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Zero-Trust Gate Security</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              QR anti-replay windows, biometric dual-factor checks, and gate bypass policies.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/alerts/rules"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
              <Bell className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Automated Alert Rules</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Thresholds for curfew violations, tailgating, unapproved passes, and rapid notifications.
            </p>
          </div>
        </Link>

        <Link
          href="/sysadmin/exit-reasons"
          className="p-5 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
              <DoorOpen className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">Exit Reason Master Data</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Standardized campus departure categorizations (medical, official, weekend, day-out).
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
