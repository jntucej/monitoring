"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import {
  Loader2,
  AlertTriangle,
  ArrowRight,
  History,
  Inbox,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";

/* response shapes */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function fmtStamp(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

/* main content */

function DeputyWardenDecisionHistoryInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=hostel&stage=deputy_warden",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;

  const decisions = useMemo(
    () =>
      rows
        .filter((r) => r.status !== "PENDING")
        .map((r) => ({
          ...r,
          decidedAt: r.updated_at ?? r.created_at ?? null,
        }))
        .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "")),
    [rows]
  );

  const decidedCount = decisions.length;
  const approvedCount = decisions.filter((d) =>
    d.status === "APPROVED" || d.status === "COMPLETED"
  ).length;
  const rejectedCount = decisions.filter(
    (d) => d.status === "REJECTED" || d.status === "ESCALATED"
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/deputy-warden/daily-overview"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Daily Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">History data unavailable: {error}</span>
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

      {/* KPI row */}
      <WidgetBoundary title="Decision History">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={Inbox}
            label="Warden-Stage Records"
            value={total}
            sub="All hostel-flow records ever at the deputy-warden stage"
            accent="text-white"
            loading={busy}
          />
          <StatCard
            icon={History}
            label="Decided"
            value={decidedCount}
            sub="Records moved on from the principal stage"
            accent="text-sky-400"
            loading={busy}
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={approvedCount}
            sub="Approved or completed at principal stage"
            accent="text-emerald-400"
            loading={busy}
          />
          <StatCard
            icon={AlertTriangle}
            label="Rejected / Escalated"
            value={rejectedCount}
            sub="Rejected or escalated out of principal stage"
            accent="text-rose-400"
            loading={busy}
          />
        </div>
      </WidgetBoundary>

      {/* Decision table */}
      <WidgetBoundary title="Decisions">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />{" "}
              Loading decision history…
            </div>
          ) : decisions.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <FileText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No recorded decisions at the deputy-warden stage yet. Past gate activity and
                approval outcomes will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Ticket</th>
                    <th className="text-left px-4 py-3">Workflow</th>
                    <th className="text-left px-4 py-3">Outcome</th>
                    <th className="text-left px-4 py-3">Decided</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {decisions.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {d.ticket_number}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{d.workflow_type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                            d.status === "APPROVED" || d.status === "COMPLETED"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                              : "border-rose-400/30 bg-rose-400/10 text-rose-400"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{fmtStamp(d.decidedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function DeputyWardenDecisionHistoryPage() {
  return (
    <AuthGuard allowedRoles={['deputy_warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DeputyWardenDecisionHistoryInner />
      </Suspense>
    </AuthGuard>
  );
}
