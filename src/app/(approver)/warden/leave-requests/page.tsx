"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Inbox,
  Loader2,
  AlertTriangle,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

/* response shapes (mirror /api/permissions) */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string; hostel_block?: string; room_number?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

function EmptyState({ message, ctaHref, ctaLabel }: { message: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center text-sm min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-slate-600" />
        <p className="max-w-md text-slate-400">{message}</p>
        {ctaHref && ctaLabel && (
          <Link
            href={ctaHref}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            {ctaLabel} <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* main content */

function WardenLeaveRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  // Leave-category hostel requests waiting at the warden stage.
  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=hostel&status=PENDING&stage=warden_or_principal",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data ?? [];
  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/warden"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Warden Overview
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
            <span className="truncate">Leave data unavailable: {error}</span>
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

      <WidgetBoundary title="Leave Requests">
        {busy ? (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Loading leave requests…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            message="No leave requests are waiting at the warden stage."
            ctaHref="/warden/outpass-leave"
            ctaLabel="See outpass & leave queue"
          />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Hostel Block</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">SLA Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.slice(0, 25).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{r.student?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {r.student?.student_details?.hostel_block || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">
                      {r.current_stage.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-slate-600/40 bg-slate-600/10 text-slate-300 whitespace-nowrap">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {r.sla_deadline ? (
                        <CalendarDays className="w-3.5 h-3.5 inline-block mr-1 text-slate-500" />
                      ) : null}
                      {r.sla_deadline ? new Date(r.sla_deadline).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WardenLeaveRequestsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenLeaveRequestsInner />
    </Suspense>
  );
}
