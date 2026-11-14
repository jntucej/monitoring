"use client";

import { useMemo, useState, Suspense } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";

import { PageLoading } from "@/components/admin/shared/LoadingStates";
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
    <div className="surface-card bg-bg-elevated p-4 space-y-2 animate-pulse">
      <div className="h-3 w-24 rounded bg-bg-elevated" />
      <div className="h-5 w-32 rounded bg-bg-elevated" />
      <div className="h-3 w-40 rounded bg-bg-elevated" />
    </div>
  );
}

function AdminPermissionPoliciesInner() {
  const [query, setQuery] = useState("");

  const res = useApiResource<{ success: boolean; data: PermissionPoliciesData }>("/api/admin/permission-policies", {
    ttlMs: 30_000,
  });

  usePolling(
    () => {
      clearCache("/api/admin/permission-policies");
      return res.refresh();
    },
    { intervalMs: 60_000 }
  );

  const workflows = res.data?.data?.workflows ?? [];

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
      <PageHeader
        title="Permission Policies"
        subtitle="Workflow stage definitions, SLAs, and open approval requests"
      />
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WidgetBoundary title="Workflow Types">
          <div className="surface-card bg-bg-elevated p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <GitBranch className="w-3.5 h-3.5 text-action-success" /> Workflow Types
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-bg-elevated animate-pulse" /> : workflows.length}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">Defined pass types in circulation</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Open Requests">
          <div className="surface-card bg-bg-elevated p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <FileCheck className="w-3.5 h-3.5 text-action-warning" /> Open Requests
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading
                ? <span className="inline-block w-10 h-5 rounded bg-bg-elevated animate-pulse" />
                : workflows.reduce((sum, w) => sum + (w.open_count || 0), 0)}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">Across all workflow types</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Standard SLA">
          <div className="surface-card bg-bg-elevated p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              <Clock className="w-3.5 h-3.5 text-action-primary" /> Standard SLA
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-bg-elevated animate-pulse" /> : "48 hrs"}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">Approval turnaround target</p>
          </div>
        </WidgetBoundary>
      </div>

      {/* Workflow table */}
      <WidgetBoundary title="Permission Workflow Policies">
        <div className="rounded-2xl border border-border bg-bg-elevated overflow-hidden">
          <div className="surface-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-action-success" />
              Workflow stage definitions
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter workflows…"
                className="surface-card w-full bg-bg-surface pl-8 pr-8 py-1.5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                  aria-label="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {res.error ? (
            <div className="p-6 text-sm text-action-danger">{res.error}</div>
          ) : loading ? (
            <div className="p-4 space-y-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : visibleWorkflows.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">
              <p>No workflow definitions match the current filter.</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-xs font-semibold text-action-success hover:text-action-success"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w175">
                <thead className="bg-bg-surface/60 text-xs uppercase tracking-wide text-text-muted border-b border-border">
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
                    <tr key={w.workflow_type} className="hover:bg-bg-surface/40">
                      <td className="py-3 px-4 font-semibold text-white">{w.workflow_type}</td>
                      <td className="py-3 px-4 text-text-secondary">
                        {w.stages.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {w.stages.map((s) => (
                              <span
                                key={s.stage}
                                className="surface-card inline-flex items-center gap-1 bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary"
                              >
                                {s.stage}
                                {s.open > 0 && <span className="text-action-success tabular-nums">{s.open}</span>}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{w.document_required ? "Required" : "Optional"}</td>
                      <td className="py-3 px-4 tabular-nums text-text-secondary">
                        {w.open_count} / {w.pending_count}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-text-secondary">{w.sla_hours} hrs</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {w.approver_roles.map((r) => (
                            <span key={r} className="surface-card bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
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
          <div className="surface-card p-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Users className="w-3.5 h-3.5 text-action-success" />
              {loading
                ? "Loading role policy…"
                : `${workflows.length > 0 ? workflows.map((w) => w.workflow_type).join(", ") : "N/A"} — role policy entries are managed under Roles.`}
            </div>
          </div>
        </div>
      </WidgetBoundary>

      {/* Read-only notice */}
      <WidgetBoundary title="Editing note">
        <div className="surface-card bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-action-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-action-warning">Read-only view</p>
            <p className="mt-1 text-xs text-text-muted">
              Permission workflow definitions, stage SLAs and role policy are locked for admins — editing
              requires sysadmin access. If a stage, SLA or approver chain is out of date, raise a role
              change request or contact the platform team.
            </p>
          </div>
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function AdminPermissionPoliciesPage() {
  return (
    <div className="p-2 sm:p-0">
      <Suspense fallback={<PageLoading />}>
        <AdminPermissionPoliciesInner />
      </Suspense>
    </div>
  );
}
