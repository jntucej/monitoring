"use client";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import { Database, HardDrive, Download, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
=======
import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { BackupManagement } from "@/components/sysadmin/BackupManagement";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import Link from "next/link";
import {
  AlertTriangle,
  Database,
  HardDrive,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

interface BackupStatusData {
  source: "host-backup-dir" | "unavailable";
  lastBackup: { name: string; mtime: string; sizeBytes: number } | null;
  lastBackupAgeHours: number | null;
  stale: boolean;
  daily: Array<{ name: string; mtime: string; sizeBytes: number }>;
  weekly: Array<{ name: string; mtime: string; sizeBytes: number }>;
}

function formatAge(hours: number | null): string {
  if (hours == null) return "unknown";
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function BackupReinforcedInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: BackupStatusData }
  >("/api/sysadmin/backup-status", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const d = (data as { success: boolean; data: BackupStatusData } | null)?.data;
  const size = useMemo(
    () =>
      (n: number) =>
        n > 1024 * 1024 * 1024
          ? `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
          : n > 1024 * 1024
            ? `${Math.round(n / (1024 * 1024))} MB`
            : `${Math.round(n / 1024)} KB`,
    []
  );

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Backup & Export</p>
          <p className="text-[var(--text-muted)] mt-1">Manage database backups and data exports</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--bg-base)] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
=======
    <div className="space-y-6 max-w-7xl mx-auto min-w-0">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-400" />
          Backup Status
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Cron dump freshness from /opt/monitoring/backups, plus manual backup &amp; export tooling.
          Signed in as <span className="font-mono text-slate-300">{role}</span>.
        </p>
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
      </div>

      {/* Cron backup freshness strip */}
      <WidgetBoundary title="Cron Backup Freshness">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" /> Host Backup Directory
            </span>
            <span className="text-xs text-slate-500">source: {d?.source ?? "loading"}</span>
          </div>
          {busy ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800/40" />
              ))}
            </div>
          ) : d?.source === "unavailable" || !d?.lastBackup ? (
            <div className="p-6 text-center min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-400/70 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                Host backup directory not visible in this environment.
              </p>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                The cron dumps live on the production host under /opt/monitoring/backups. Use the
                dev/ops contact strip below if you need to verify dump integrity off-host.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 min-w-0">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Last Backup</p>
                <p className="mt-1 text-sm font-bold text-emerald-400 truncate">
                  {d.lastBackup.name}
                </p>
                <p className="text-xs text-slate-500">{size(d.lastBackup.sizeBytes)}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Age</p>
                <p
                  className={`mt-1 text-sm font-bold ${d.stale ? "text-rose-400" : "text-sky-400"}`}
                >
                  {formatAge(d.lastBackupAgeHours)}
                </p>
                <p className="text-xs text-slate-500">
                  {d.stale ? "older than 24h — verify cron" : "within 24h window"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Cron Cadence</p>
                <p className="mt-1 text-sm font-bold text-slate-200">
                  {d.daily.length} daily · {d.weekly.length} weekly
                </p>
                <p className="text-xs text-slate-500">most recent entries shown below</p>
              </div>
            </div>
          )}
          {!busy && d && d.source === "host-backup-dir" && d.daily.length > 0 && (
            <div className="px-4 pb-4 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Recent Dumps</p>
                <button
                  type="button"
                  onClick={() => void refreshAll()}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                {d.daily.slice(0, 6).map((b) => (
                  <div
                    key={b.name}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 flex items-center justify-between gap-2 min-w-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-300 truncate">{b.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(b.mtime).toLocaleString()} · {size(b.sizeBytes)}
                      </p>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Backup status unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Manual backup & export tooling (existing component) */}
      <WidgetBoundary title="Manual Backups & Exports">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            Full-DB and per-table dumps &amp; CSV exports remain available here.
          </div>
          <BackupTools />
        </div>
      </WidgetBoundary>

      <div className="flex flex-wrap gap-2 min-w-0">
        <Link
          href="/sysadmin/data"
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          Data Governance &amp; Retention →
        </Link>
        <Link
          href="/sysadmin/audit"
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          Audit this action →
        </Link>
      </div>

      <DevContactStrip />
    </div>
  );
}

/* Minimal manual backup tools — preserves the core action without duplicating the
   existing /api/admin/backup management component */

function BackupTools() {
  return <BackupManagement />;
}

export default function SysadminBackupPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <BackupReinforcedInner />
      </Suspense>
    </AuthGuard>
  );
}
