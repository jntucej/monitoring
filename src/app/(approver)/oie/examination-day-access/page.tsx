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
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  Inbox,
} from "lucide-react";

interface DayAccessRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: DayAccessRow[];
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

function AccessDayTable({ rows }: { rows: DayAccessRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No exam-day access exceptions detected today. All candidates cleared the gate as expected." />
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
                {r.student?.name || "—"}
                {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
              </td>
              <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">
                {r.current_stage?.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-sky-400/30 bg-sky-400/10 text-sky-400 whitespace-nowrap">
                  {r.status}
                </span>
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

function ExaminationDayAccessInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const {
    data: accessData,
    loading,
    error,
    refresh: refreshAccess,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=exam&status=PENDING",
    { ttlMs: 30_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshAccess();
  }, [refreshAccess]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const rows = accessData?.data ?? [];
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
          message={`Exam-day access data failed to load: ${error}`}
          onRetry={() => void refreshAccess()}
        />
      )}

      {/* KPI strip */}
      <WidgetBoundary title="Examination Day Access KPIs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-0">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
              <CalendarClock className="w-4 h-4 shrink-0" />
              <span>Exam-day Queue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400 mt-2">{rows.length}</p>
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
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Workflow</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">exam</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wide">
              <Inbox className="w-4 h-4 shrink-0" />
              <span>Stage</span>
            </div>
            <p className="text-2xl font-bold text-sky-400 mt-2">oie</p>
          </div>
        </div>
      </WidgetBoundary>

      <WidgetBoundary title="Examination-Day Access Records">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Exam-day Access Exceptions
            </span>
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} />
            </div>
          ) : (
            <AccessDayTable rows={rows} />
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExaminationDayAccessPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExaminationDayAccessInner />
    </Suspense>
  );
}
