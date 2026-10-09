"use client";

import Link from "next/link";
import { Database, ShieldCheck, Clock, Archive, ArrowUpRight, HardDrive, FileCheck2 } from "lucide-react";
import { BackupManagement } from "@/components/sysadmin/BackupManagement";

export default function DataManagementHubPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Data Governance & Backups</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Automated snapshots, SHA-256 verified disaster recovery, and data retention policies.
        </p>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Retention Policy</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">30D / 12W / 12M</p>
          <p className="text-xs text-[var(--text-muted)]">30 daily, 12 weekly, 12 monthly tiers</p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Integrity Verification</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-500">SHA-256 Gated</p>
          <p className="text-xs text-[var(--text-muted)]">Automatic dry-run checksum before restore</p>
        </div>

        <Link
          href="/sysadmin/compliance"
          className="p-4 rounded-xl bg-[var(--surface-default)] border border-[var(--border-subtle)] hover:border-[var(--primary)] transition group shadow-sm space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Compliance Hub</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">GDPR & DPDP</p>
          <p className="text-xs text-[var(--text-muted)]">Data subject exports & anonymization</p>
        </Link>
      </div>

      {/* Main Backup & Restore Management Component */}
      <BackupManagement />
    </div>
  );
}
