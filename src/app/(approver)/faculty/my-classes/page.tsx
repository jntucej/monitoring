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
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ShieldCheck,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Inbox
} from "lucide-react";

/* response shapes */

interface MyClassRow {
  id: string;
  departmentId: string;
  year: number;
  section: string;
  name: string | null;
  capacity: number | null;
  subjectCodes?: string[];
}

interface MyClassesResponse {
  success: boolean;
  data: MyClassRow[];
}

function FacultyMyclassesInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "faculty") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<MyClassesResponse>("/api/faculty/my-classes?role=class_teacher", { ttlMs: 30_000 });

  const classes = data?.data ?? [];

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/faculty"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Faculty Overview
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
            <span className="truncate">My Classes data unavailable: {error}</span>
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

      <WidgetBoundary title="My Classes">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">My Classes</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{classes.length} class(es) assigned</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading My Classes…
            </div>
          ) : classes.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No classes are assigned to you yet. Your HOD can assign you to a class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                    <th className="py-2 pr-4">Class</th>
                    <th className="py-2 pr-4">Section</th>
                    <th className="py-2 pr-4">Capacity</th>
                    <th className="py-2">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-300 whitespace-nowrap">Year {c.year}</td>
                      <td className="py-2 pr-4 text-slate-300">{c.section}</td>
                      <td className="py-2 pr-4 text-slate-400">{c.capacity ?? "—"}</td>
                      <td className="py-2 text-slate-200">{c.name || "—"}</td>
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
export default function FacultyMyclassesPage() {
  return (
    <AuthGuard allowedRoles={['faculty', 'hod', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <FacultyMyclassesInner />
      </Suspense>
    </AuthGuard>
  );
}
