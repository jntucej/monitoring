"use client";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import {
  Loader2,
  Inbox,
  AlertTriangle,
  Ticket
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

/* ── shapes ── */

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  student_user_id?: string | null;
  current_stage?: string;
  sla_deadline?: string | null;
  created_at?: string;
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

/* ── helpers ── */

function statusBadge(status?: string) {
  const s = (status ?? "PENDING").toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-400";
  if (s === "REJECTED" || s === "CANCELLED")
    return "border-rose-400/30 bg-rose-400/10 text-rose-400";
  if (s === "PENDING")
    return "border-amber-400/30 bg-amber-400/10 text-amber-400";
  return "border-slate-400/30 bg-slate-400/10 text-slate-400";
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-base)]/60 p-8 text-center text-sm text-[var(--text-muted)]">
      <Inbox className="w-6 h-6 mx-auto mb-2 text-slate-600" />
      <p>{message}</p>
    </div>
  );
}

/* ── main ── */

function ChildRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  // /api/permissions?status=PENDING — the server auto-scopes to the
  // guardian's linked wards (parent/guardian branch in the route handler).
  const {
    data: perms,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionListData>("/api/permissions?status=PENDING", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const refreshAll = useCallback(async () => {
    clearCache("/api/permissions?status=PENDING");
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!userId });

  const rows = useMemo<PermissionRow[]>(() => {
    const r = perms?.data;
    return Array.isArray(r) ? r : [];
  }, [perms]);

  const pending = rows.filter((r) => (r.status ?? "PENDING").toUpperCase() === "PENDING");
  const total = perms?.total ?? rows.length;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-emerald-400" />
            Child Requests
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Pending pass and leave requests from your wards
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 flex items-center gap-3 text-[var(--text-muted)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="No pending requests from your wards. The queue is clear." />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Pending Requests
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              {total > 0 ? `${total} total` : "queue clear"}
            </span>
          </div>
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Ticket</th>
                  <th className="text-left px-4 py-3">Ward</th>
                  <th className="text-left px-4 py-3">Workflow</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">SLA</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60">
                {rows.slice(0, 20).map((r) => {
                  const slaBreached = r.sla_deadline
                    ? new Date(r.sla_deadline).getTime() < Date.now()
                    : false;
                  return (
                    <tr key={r.id} className="hover:bg-[var(--bg-base)]/40 transition-colors motion-reduce:transition-none">
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {r.ticket_number || r.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll
                          ? ` · ${r.student.student_details.roll}`
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] capitalize whitespace-nowrap">
                        {(r.workflow_type ?? "").replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                        {r.current_stage || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.sla_deadline ? (
                          slaBreached ? (
                            <span className="text-rose-400">
                              Breached ·{" "}
                              {new Date(r.sla_deadline).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">
                              {new Date(r.sla_deadline).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusBadge(r.status)}`}
                        >
                          {r.status || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5 text-amber-400" />
          {pending.length} request(s) currently pending. Approval actions are available on the full
          permissions flow at the campus office.
        </p>
      )}
    </div>
  );
}
export default function ChildRequestsPage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <ChildRequestsInner />
      </Suspense>
    </AuthGuard>
  );
}
