"use client";

import { useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { ShieldCheck, GitBranch, FileCheck, Clock, Users, Search, X, Lock } from "lucide-react";

/* ── response shape (mirrors /api/admin/permission-policies) ─────────────── */

interface PolicyWorkflow {
  workflow_type: string;
  current_stage: string;
  document_required: boolean;
  open_count: number;
  pending_count: number;
  last_seen: string | null;
  first_seen: string | null;
  stages: { stage: string; open: number }[];
  sla_hours: number;
  approver_roles: string[];
}

interface PolicyRole {
  code: string;
  permissions: unknown;
}

interface PermissionPoliciesData {
  workflows: PolicyWorkflow[];
  roles: PolicyRole[];
  note?: string;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 space-y-2 animate-pulse">
      <div className="h-3 w-24 rounded bg-slate-800" />
      <div className="h-5 w-32 rounded bg-slate-800" />
      <div className="h-3 w-40 rounded bg-slate-800" />
    </div>
  );
}

function AdminPermissionPoliciesInner() {
  const [query, setQuery] = useState("");

  const res = useApiResource<PermissionPoliciesData>("/api/admin/permission-policies", {
    ttlMs: 30_000,
  });

  usePolling(
    () => {
      clearCache("/api/admin/permission-policies");
      return res.refresh();
    },
    { intervalMs: 60_000 }
  );

  const workflows = res.data?.workflows ?? [];

  const visibleWorkflows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.workflow_type.toLowerCase().includes(q) ||
        w.current_stage.toLowerCase().includes(q)
    );
  }, [workflows, query]);

  const loading = res.loading && !res.data;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WidgetBoundary title="Workflow Types">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" /> Workflow Types
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : workflows.length}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Defined pass types in circulation</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Open Requests">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <FileCheck className="w-3.5 h-3.5 text-amber-400" /> Open Requests
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading
                ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" />
                : workflows.reduce((sum, w) => sum + (w.open_count || 0), 0)}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Across all workflow types</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Standard SLA">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Standard SLA
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : "48 hrs"}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Approval turnaround target</p>
          </div>
        </WidgetBoundary>
      </div>

      {/* Workflow table */}
      <WidgetBoundary title="Permission Workflow Policies">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Workflow stage definitions
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter workflows…"
                className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {res.error ? (
            <div className="p-6 text-sm text-rose-400">{res.error}</div>
          ) : loading ? (
            <div className="p-4 space-y-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : visibleWorkflows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <p>No workflow definitions match the current filter.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Workflow</th>
                    <th className="py-2.5 px-4">Current Stage</th>
                    <th className="py-2.5 px-4">Document</th>
                    <th className="py-2.5 px-4">Open / Pending</th>
                    <th className="py-2.5 px-4">SLA</th>
                    <th className="py-2.5 px-4">Approvers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {visibleWorkflows.map((w) => (
                    <tr key={w.workflow_type} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-semibold text-white">{w.workflow_type}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {w.stages.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {w.stages.map((s) => (
                              <span
                                key={s.stage}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
                              >
                                {s.stage}
                                {s.open > 0 && <span className="text-emerald-400 tabular-nums">{s.open}</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{w.document_required ? "Required" : "Optional"}</td>
                      <td className="py-3 px-4 tabular-nums text-slate-300">
                        {w.open_count} / {w.pending_count}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-300">{w.sla_hours} hrs</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {w.approver_roles.map((r) => (
                            <span key={r} className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] text-blue-300">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Role policy (read-only) */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              {loading
                ? "Loading role policy…"
                : `${workflows.length > 0 ? workflows.map((w) => w.workflow_type).join(", ") : "N/A"} — role policy entries are managed under Roles.`}
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {/* Read-only notice */}
      <WidgetBoundary title="Editing note">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Read-only view</p>
            <p className="mt-1 text-xs text-slate-400">
              Permission workflow definitions, stage SLAs and role policy are locked for admins — editing
              requires sysadmin access. If a stage, SLA or approver chain is out of date, raise a role
              change request or contact the platform team.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function AdminPermissionPoliciesPage() {
  return (
    <div className="p-2 sm:p-0">
      <PageLoading />
      <SuspenseFallback>
        <AdminPermissionPoliciesInner />
      </SuspenseFallback>
    </div>
  );
}

/* Keep the page component self-contained per the house style. */
import { Suspense } from "react";
function SuspenseFallback({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
