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
  Gavel,
  Inbox,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";

/* response shapes */

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: { name: string; student_details?: { roll?: string } | null } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

interface DelegationStatusResponse {
  success: boolean;
  data: { active: boolean; scopes: string[]; delegatedBy?: string; note?: string };
}

/* building blocks */

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

function DelegationBadge({ active, loading }: { active: boolean; loading: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
        <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> Checking delegation…
      </span>
    );
  }
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
      <Gavel className="w-3 h-3" /> Within delegated scope — approval actions enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/50 bg-slate-700/30 px-2.5 py-1 text-xs font-semibold text-slate-300">
      <Gavel className="w-3 h-3" /> Read-only — no delegation data recorded yet
    </span>
  );
}

/* main content */

function DeputyWardenDelegatedApprovalsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=hostel&status=PENDING&stage=deputy_warden",
    { ttlMs: 30_000 }
  );
  const {
    data: delegation,
    loading: delegationLoading,
    refresh: refreshDelegation,
  } = useApiResource<DelegationStatusResponse>("/api/deputy-warden/delegation", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refresh(), refreshDelegation()]);
  }, [refresh, refreshDelegation]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = (loading && !data) || (delegationLoading && !delegation);
  const delegationActive = Boolean(delegation?.data?.active);
  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;

  const slaBreached = useMemo(
    () =>
      rows.filter((r) => {
        if (!r.sla_deadline) return false;
        const ts = new Date(r.sla_deadline).getTime();
        return !Number.isNaN(ts) && ts < Date.now();
      }).length,
    [rows]
  );

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
          <p className="text-xs text-slate-500 mt-1 min-w-0">
            Authority: the deputy warden acts only within the explicit delegation or standing policy
            scope of the principal/warden. Delegation data drives the badge below.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Approvals data unavailable: {error}</span>
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
      <WidgetBoundary title="Delegated Approvals">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          <StatCard
            icon={Inbox}
            label="Pending at Warden Stage"
            value={total}
            sub="Hostel / outpass requests awaiting warden review"
            accent="text-amber-400"
            loading={loading && !data}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={slaBreached}
            sub="Requests past their 48h deadline"
            accent="text-rose-400"
            loading={loading && !data}
          />
          <StatCard
            icon={UserCheck}
            label="Delegation"
            value={delegationActive ? "Active" : "Not recorded"}
            sub={
              delegationActive
                ? "Approval actions enabled within delegated scope"
                : "No delegation data — this view is read-only"
            }
            accent={delegationActive ? "text-emerald-400" : "text-slate-300"}
            loading={delegationLoading && !delegation}
          />
        </div>
      </WidgetBoundary>

      {/* Delegation status banner */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-wrap items-center gap-3 min-w-0">
        <DelegationBadge active={delegationActive} loading={delegationLoading && !delegation} />
        <p className="text-xs text-slate-500 min-w-0">
          {delegation?.data?.note ??
            "Delegation data is read from the principal/warden policy ledger; until a delegation is recorded, decisions here are logged as review notes and escalated to the warden stage."}
        </p>
      </div>

      {/* Queue table */}
      <WidgetBoundary title="Approval Queue">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />{" "}
              Loading delegated-approval queue…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No pending items at the deputy-warden stage. The queue is clear.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Ticket</th>
                    <th className="text-left px-4 py-3">Workflow</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">SLA</th>
                    <th className="text-left px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {r.ticket_number}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.workflow_type}</td>
                      <td className="px-4 py-3 text-slate-400">{r.status}</td>
                      <td className="px-4 py-3">
                        {r.sla_deadline ? (
                          <span className="text-slate-400">
                            {new Date(r.sla_deadline).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {delegationActive ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 whitespace-nowrap">
                            Reviewable
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-slate-600/50 bg-slate-700/30 text-slate-400 whitespace-nowrap">
                            Read-only
                          </span>
                        )}
                      </td>
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
export default function DeputyWardenDelegatedApprovalsPage() {
  return (
    <AuthGuard allowedRoles={['deputy_warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DeputyWardenDelegatedApprovalsInner />
      </Suspense>
    </AuthGuard>
  );
}
