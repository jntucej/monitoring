"use client";


import Link from "next/link";
import { ShieldCheck, Clock, ArrowUpRight } from "lucide-react";
import { BackupManagement } from "@/components/sysadmin/BackupManagement";

export default function DataManagementHubPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-2xl font-bold tracking-tight text-text-primary">Data Governance & Backups</p>
        <p className="text-sm text-text-secondary mt-1">
          Automated snapshots, SHA-256 verified disaster recovery, and data retention policies.
        </p>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card p-4 bg-bg-base space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Retention Policy</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-lg font-bold text-text-primary">30D / 12W / 12M</p>
          <p className="text-xs text-text-muted">30 daily, 12 weekly, 12 monthly tiers</p>
        </div>

        <div className="surface-card p-4 bg-bg-base space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Integrity Verification</span>
            <ShieldCheck className="w-4 h-4 text-action-success" />
          </div>
          <p className="text-lg font-bold text-action-success">SHA-256 Gated</p>
          <p className="text-xs text-text-muted">Automatic dry-run checksum before restore</p>
        </div>

        <Link
          href="/sysadmin/compliance"
          className="surface-card p-4 bg-bg-base hover: (--primary)] transition group space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Compliance Hub</span>
            <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-[var(--primary)] transition" />
          </div>
          <p className="text-lg font-bold text-text-primary">GDPR & DPDP</p>
          <p className="text-xs text-text-muted">Data subject exports & anonymization</p>
        </Link>
      </div>

      {/* Main Backup & Restore Management Component */}
      <BackupManagement />
    </div>
  );
}
