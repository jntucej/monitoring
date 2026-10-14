"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading, TableSkeleton } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  ArrowRight,
  ShieldOff,
  AlertTriangle,
  Inbox,
  FileWarning,
} from "lucide-react";

interface AccessExceptionRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  updated_at?: string;
  candidate_name?: string | null;
  candidate_unique_id?: string | null;
  roll?: string | null;
}

interface AccessExceptionsResponse {
  success: boolean;
  data: AccessExceptionRow[];
  total?: number;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-slate-600" />
        <p className="max-w-md text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    REJECTED: "border-rose-400/30 bg-rose-400/10 text-rose-400",
    ESCALATED: "border-purple-400/30 bg-purple-400/10 text-purple-400",
    APPROVED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  };
  const cls = styles[status] ?? "border-slate-400/30 bg-slate-400/10 text-slate-400";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${cls}`}
    >
      {status}
    </span>
  );
}

function ExceptionTable({ rows }: { rows: AccessExceptionRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No access exceptions found. All exam-day access requests are in good standing." />
    );
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Candidate</th>
            <th className="text-left px-4 py-3">Stage</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 20).map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3">
                <a
                  href={`/permissions/${r.ticket_number}`}
                  className="text-white font-mono text-xs whitespace-nowrap hover:text-emerald-400"
                >
                  {r.ticket_number}
                </a>
              </td>
              <td className="px-4 py-3 text-slate-300 min-w-0">
                {r.candidate_name || "—"}
                {r.roll ? <span className="ml-2 text-xs text-slate-500">{r.roll}</span> : null}
              </td>
              <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">
                {r.current_stage?.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                {r.sla_deadline ? (
                  new Date(r.sla_deadline).getTime() < Date.now() ? (
                    <span className="text-rose-400">
                      Breached · {new Date(r.sla_deadline).toLocaleString()}
                    </span>
                  ) : (
                    new Date(r.sla_deadline).toLocaleString()
                  )
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessExceptionsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh: refreshExceptions,
  } = useApiResource<AccessExceptionsResponse>("/api/exam/access-exceptions", {
    ttlMs: 30_000,
  });

  const refresh = useCallback(async () => {
    clearCache();
    await refreshExceptions();
  }, [refreshExceptions]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data ?? [];
  const breachedCount = rows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={`Access exceptions failed to load: ${error}`}
          onRetry={() => void refreshExceptions()}
        />
      )}

      {/* KPI strip */}
      <WidgetBoundary title="Access Exception KPIs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-0">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
              <FileWarning className="w-4 h-4 shrink-0" />
              <span>Exceptions</span>
            </div>
            <p className="text-2xl font-bold text-amber-400 mt-2">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>SLA Breached</span>
            </div>
            <p className="text-2xl font-bold text-rose-400 mt-2">{breachedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
              <ShieldOff className="w-4 h-4 shrink-0" />
              <span>Rejected</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">
              {rows.filter((r) => r.status === "REJECTED").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
              <Inbox className="w-4 h-4 shrink-0" />
              <span>Escala</span>
            </div>
            <p className="text-2xl font-bold text-sky-400 mt-2">
              {rows.filter((r) => r.status === "ESCALATED").length}
            </p>
          </div>
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Exam Access Exceptions">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <ShieldOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Rejected &amp; Escalated Exam Access Requests
            </span>
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : (
            <ExceptionTable rows={rows} />
          )}
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            Exceptions are surfaced for OIE review only. Resolution is handled by the
            relevant exam-branch or hod office.
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function AccessExceptionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AccessExceptionsInner />
    </Suspense>
  );
}
