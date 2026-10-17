"use client";

import { useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  GitBranch,
  FileCheck,
  Clock,
  Search,
  X,
  Lock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";

/* ── response shape (mirrors /api/admin/workflow-configuration) ───────────── */

interface WorkflowStat {
  workflow_type: string;
  current_stage: string;
  open: number;
  pending: number;
  completed: number;
  rejected: number;
  last_active: string | null;
}

interface PassTypeConfig {
  code: string;
  name: string;
  requires_approval: boolean;
  approval_flow: string | null;
  is_active: boolean;
  sla_hours: number;
  volume_total: number;
  volume_pending: number;
  workflow: WorkflowStat | null;
}

interface WorkflowConfigData {
  pass_types: PassTypeConfig[];
  workflow_stats: WorkflowStat[];
  note?: string;
}

function AdminWorkflowConfigurationInner() {
  const [query, setQuery] = useState("");

  const res = useApiResource<WorkflowConfigData>("/api/admin/workflow-configuration", { ttlMs: 30_000 });

  usePolling(
    () => {
      clearCache("/api/admin/workflow-configuration");
      return res.refresh();
    },
    { intervalMs: 60_000 }
  );

  const passTypes = res.data?.pass_types ?? [];
  const loading = res.loading && !res.data;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return passTypes;
    return passTypes.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
    );
  }, [passTypes, query]);

  const totalPending = useMemo(
    () => passTypes.reduce((sum, p) => sum + (p.volume_pending || 0), 0),
    [passTypes]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workflow Configuration"
        subtitle="Pass types, pending requests, and approval routing"
      />
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WidgetBoundary title="Pass Types">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <GitBranch className="w-3.5 h-3.5 text-emerald-400" /> Pass Types
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : passTypes.length}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Configured workflow definitions</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Pending">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <FileCheck className="w-3.5 h-3.5 text-amber-400" /> Awaiting Approval
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : totalPending}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Passes queued across all workflows</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Standard SLA">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Standard SLA
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : "48 hrs"}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Approval turnaround target</p>
          </div>
        </WidgetBoundary>
      </div>

      {/* Per-pass-type definitions */}
      <WidgetBoundary title="Workflow Definitions">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              Per-pass-type definitions
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter pass types…"
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
              <div className="h-4 w-40 rounded bg-slate-800 animate-pulse" />
              <div className="h-4 w-52 rounded bg-slate-800 animate-pulse" />
              <div className="h-4 w-36 rounded bg-slate-800 animate-pulse" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <p>No pass type definitions found.</p>
              <Link
                href="/admin/settings"
                className="mt-3 inline-block text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Configure in Settings →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[720px]">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Pass Type</th>
                    <th className="py-2.5 px-4">Approval</th>
                    <th className="py-2.5 px-4">Current Stage</th>
                    <th className="py-2.5 px-4">Volume (pending)</th>
                    <th className="py-2.5 px-4">SLA</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {visible.map((p) => (
                    <tr key={p.code} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white">{p.name}</p>
                        <p className="text-[11px] text-slate-500">{p.code}</p>
                      </td>
                      <td className="py-3 px-4">
                        {p.requires_approval ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3" /> {p.approval_flow || "Approval"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 text-slate-400 px-2 py-0.5 text-[11px] font-medium">
                            Direct issue
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {p.workflow?.current_stage || (
                          <span className="text-slate-500">No active requests</span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-300">
                        {p.volume_total} ({p.volume_pending} pending)
                      </td>
                      <td className="py-3 px-4 tabular-nums text-slate-300">{p.sla_hours} hrs</td>
                      <td className="py-3 px-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <XCircle className="w-3 h-3" /> Disabled
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

      {/* Read-only notice */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Read-only view</p>
          <p className="mt-1 text-xs text-slate-400">
            Workflow stage definitions, approver chains and SLA targets are locked for admins — changes
            require sysadmin access. For stage re-ordering or new pass types, contact the platform team.
          </p>
        </div>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function AdminWorkflowConfigurationPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <AdminWorkflowConfigurationInner />
      </Suspense>
    </AuthGuard>
  );
}
