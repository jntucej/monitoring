"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  RefreshCw,
  ArrowLeft,
  ClipboardCheck,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PermissionRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
}

const WORKFLOW_LABELS: Record<string, string> = {
  hostel: "Hostel",
  outpass: "Outpass",
  exam: "Examination",
  staff_leave: "Staff Leave",
  memo: "Memo",
};

function AllPassRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [workflow, setWorkflow] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const url = useMemo(() => {
    if (!user) return null;
    const params = new URLSearchParams({ limit: "100" });
    if (workflow !== "all") params.set("workflow_type", workflow);
    return `/api/permissions?${params.toString()}`;
  }, [user, workflow]);

  const { data, loading, error, refresh } = useApiResource<{ success: boolean; data: PermissionRow[]; total?: number }>(url, {
    deps: [url],
    enabled: !!user,
    ttlMs: 10_000,
  });

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const allRows = data?.data ?? [];
  const visibleRows = allRows.filter((r) => {
    if (workflow !== "all" && r.workflow_type !== workflow) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.ticket_number?.toLowerCase().includes(q) ||
      r.student?.name?.toLowerCase().includes(q) ||
      (r.student?.student_details?.roll ?? "").toLowerCase().includes(q)
    );
  });

  const workflows = ["all", ...Object.keys(WORKFLOW_LABELS)];

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · every pass request at the principal stage
          </p>
        </div>
      </div>

      {/* Workflow filter + search */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0">
        <div role="tablist" aria-label="Workflow type" className="flex overflow-x-auto no-scrollbar gap-1">
          {workflows.map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={workflow === w}
              onClick={() => setWorkflow(w)}
              className={`inline-flex shrink-0 items-center rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                workflow === w
                  ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)] border border-[var(--action-primary)]/30"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent"
              }`}
            >
              {w === "all" ? "All" : WORKFLOW_LABELS[w] ?? w}
            </button>
          ))}
        </div>
        <label className="relative block sm:ml-auto sm:w-64 min-w-0" aria-label="Search pass requests">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, name, roll…"
            aria-label="Search pass requests by ticket, student name, or roll number"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/40"
          />
        </label>
      </div>

      <WidgetBoundary title="All Pass Requests">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {loading && allRows.length === 0 ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              title="Could not load pass requests"
              description={error}
              icon={<ClipboardCheck className="w-6 h-6 text-[var(--text-muted)]" />}
              action={
                <button
                  type="button"
                  onClick={() => void manualRefresh()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              }
            />
          ) : visibleRows.length === 0 ? (
            <EmptyState
              title="No pass requests found"
              description={
                allRows.length === 0
                  ? "There are no pass requests visible at the principal stage."
                  : "No requests match the current filter. Try a different workflow or clear the search."
              }
              icon={<ClipboardCheck className="w-6 h-6 text-[var(--text-muted)]" />}
              action={
                <Link
                  href="/principal/approval-centre"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  Open Approval Centre
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2">Ticket</th>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">Workflow</th>
                    <th className="text-left px-3 py-2">Stage</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visibleRows.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-elevated)]">
                      <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-primary)] whitespace-nowrap">
                        {r.ticket_number}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-primary)] min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] capitalize whitespace-nowrap">
                        {WORKFLOW_LABELS[r.workflow_type] ?? r.workflow_type}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] capitalize whitespace-nowrap">
                        {r.current_stage || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${
                            r.status === "PENDING"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                              : r.status === "APPROVED" || r.status === "COMPLETED"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                              : r.status === "ESCALATED"
                              ? "border-sky-400/30 bg-sky-400/10 text-sky-400"
                              : "border-rose-400/30 bg-rose-400/10 text-rose-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-[var(--text-muted)] whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                {visibleRows.length} of {allRows.length} requests shown.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function AllPassRequestsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AllPassRequestsInner />
    </Suspense>
  );
}
