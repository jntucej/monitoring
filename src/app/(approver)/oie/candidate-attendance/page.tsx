"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

import { PageLoading, TableSkeleton } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ArrowRight,
  Users,
  AlertTriangle,
  Inbox,
} from "lucide-react";

interface AttendanceRow {
  id: string;
  person_id: string;
  date: string;
  time_in?: string | null;
  time_out?: string | null;
  status: string;
  direction: string;
  timestamp_utc: string;
  candidate_name?: string | null;
  candidate_unique_id?: string | null;
  roll?: string | null;
}

interface CandidateAttendanceResponse {
  success: boolean;
  data: AttendanceRow[];
  total?: number;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-base p-8 text-center min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-text-muted" />
        <p className="max-w-md text-sm text-text-muted">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
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

function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No candidate attendance records found. Records appear here as exam-day gate scans are logged." />
    );
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Candidate</th>
            <th className="text-left px-4 py-3">Roll</th>
            <th className="text-left px-4 py-3">Direction</th>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-left px-4 py-3">Timestamp</th>
            <th className="text-left px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 25).map((r) => (
            <tr key={r.id} className="hover:bg-bg-elevated/30 transition-colors">
              <td className="px-4 py-3 text-text-secondary min-w-0">
                {r.candidate_name || "—"}
                {r.candidate_unique_id ? (
                  <span className="ml-2 text-xs text-text-muted">{r.candidate_unique_id}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                {r.roll || "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                    r.direction === "IN"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-action-success"
                      : "border-amber-400/30 bg-amber-400/10 text-action-warning"
                  }`}
                >
                  {r.direction}
                </span>
              </td>
              <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                {r.date}
              </td>
              <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                {new Date(r.timestamp_utc).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                {r.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateAttendanceInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh: refreshAttendance,
  } = useApiResource<CandidateAttendanceResponse>("/api/exam/candidate-attendance", {
    ttlMs: 30_000,
  });

  const refresh = useCallback(async () => {
    clearCache();
    await refreshAttendance();
  }, [refreshAttendance]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={`Candidate attendance data failed to load: ${error}`}
          onRetry={() => void refreshAttendance()}
        />
      )}

      <WidgetBoundary title="Candidate Attendance">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-action-success shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Recent Exam Candidate Gate Records
            </span>
            {rows.length > 0 && (
              <span className="ml-auto text-xs text-text-muted shrink-0">
                {rows.length} records
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : (
            <AttendanceTable rows={rows} />
          )}
          <div className="px-4 py-3 border-t border-border text-xs text-text-muted min-w-0">
            Records are read-only. Marks, grades, and confidential results are not exposed at
            this tier.
          </div>
        </div>
      </WidgetBoundary>

    </div>
  );
}
export default function CandidateAttendancePage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <CandidateAttendanceInner />
      </Suspense>
    </AuthGuard>
  );
}
