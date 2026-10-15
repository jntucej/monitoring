"use client";

import { Suspense, useCallback, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  RefreshCw,
  ArrowLeft,
  ScrollText,
  Inbox,
  CheckCircle2,
  Clock,
  Flag,
  CalendarClock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface PermissionRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sla_deadline?: string | null;
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
}

type TabKey = "PENDING" | "REJECTED" | "ESCALATED" | "OVERDUE";

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "PENDING", label: "Pending", icon: Inbox },
  { key: "REJECTED", label: "Rejected", icon: ScrollText },
  { key: "ESCALATED", label: "Escalated", icon: Flag },
  { key: "OVERDUE", label: "Overdue", icon: Clock },
];

function ApprovalCentreInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [tab, setTab] = useState<TabKey>("PENDING");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const { data, loading, error, refresh } = useApiResource<{ success: boolean; data: PermissionRow[]; total?: number }>(
    user ? `/api/permissions?status=${tab}&stage=principal&limit=100` : null,
    { deps: [tab, user?.id], enabled: !!user, ttlMs: 10_000 }
  );

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user && tab === "PENDING" });

  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    clearCache();
    await refresh();
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [refresh]);

  const displayRows = data?.data ?? [];
  const isOverdue = (r: PermissionRow) =>
    tab !== "OVERDUE" && !!r.sla_deadline && new Date(r.sla_deadline).getTime() < Date.now();

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
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · campus-wide oversight
          </p>
        </div>
      </div>

      {/* Tab bar — status / SLA views over /api/permissions */}
      <div
        role="tablist"
        aria-label="Approval centre views"
        className="flex overflow-x-auto no-scrollbar gap-1 min-w-0"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
              tab === key
                ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)] border border-[var(--action-primary)]/30"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <WidgetBoundary title="Approval Centre">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {loading && displayRows.length === 0 ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              title="Could not load approvals"
              description={error}
              icon={<ScrollText className="w-6 h-6 text-[var(--text-muted)]" />}
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
          ) : displayRows.length === 0 ? (
            <EmptyState
              title={tab === "OVERDUE" ? "Nothing overdue" : "Queue is clear"}
              description={
                tab === "PENDING"
                  ? "No approvals are waiting on the principal stage right now."
                  : `No ${tab.toLowerCase()} approvals found for the principal stage.`
              }
              icon={tab === "PENDING" ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Clock className="w-6 h-6 text-[var(--text-muted)]" />}
              action={
                <Link
                  href="/principal/all-pass-requests"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  Browse all pass requests <ArrowLeft className="w-3 h-3 rotate-180" />
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
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-left px-3 py-2">Stage</th>
                    <th className="text-left px-3 py-2">Created</th>
                    <th className="text-right px-3 py-2">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {displayRows.map((r) => (
                    <tr key={r.id} className={`hover:bg-[var(--bg-elevated)] ${isOverdue(r) ? "bg-rose-500/5" : ""}`}>
                      <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-primary)] whitespace-nowrap">
                        {r.ticket_number}
                        {tab !== "OVERDUE" && isOverdue(r) && (
                          <span className="ml-2 inline-block rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 align-middle">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-primary)] min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] capitalize whitespace-nowrap">
                        {r.workflow_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] capitalize whitespace-nowrap">
                        {r.current_stage || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)] whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {r.sla_deadline ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              isOverdue(r) || tab === "OVERDUE"
                                ? "text-rose-400"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            <CalendarClock className="w-3 h-3" />
                            {new Date(r.sla_deadline).toLocaleDateString([], {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayRows.length > 10 && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Showing first {Math.min(displayRows.length, 10)} of {displayRows.length}.
                </p>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function ApprovalCentrePage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ApprovalCentreInner />
      </Suspense>
    </AuthGuard>
  );
}
