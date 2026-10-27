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
import { Inbox, Loader2, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface StudentRow {
  id: string;
  name: string;
  roll?: string;
  uniqueId?: string;
  department?: string;
  year?: number;
  section?: string;
  hostelBlock?: string;
  roomNumber?: string;
}

interface StudentsResponse {
  success: boolean;
  data: StudentRow[];
}

function HodStudentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;
  const tier = getRoleTier(role);

  const { data, loading, error, refresh } = useApiResource<StudentsResponse>(
    "/api/students",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => { clearCache(); await refresh(); }, [refresh]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const students: StudentRow[] = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link href="/hod" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to HOD Overview
      </Link>
      <p className="text-sm text-slate-400">
        Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
      </p>
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Students data unavailable: {error}</span>
          </span>
          <button type="button" onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0">
            Retry
          </button>
        </div>
      )}
      <WidgetBoundary title="Students">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Student Directory</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{students.length} student(s)</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading Students…
            </div>
          ) : students.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No students in your department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Roll</th>
                    <th className="py-2 px-3">Year / Section</th>
                    <th className="py-2 px-3">Hostel</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-2 px-3 text-slate-200">{s.name}</td>
                      <td className="py-2 px-3 font-mono text-xs text-slate-300">{s.roll ?? s.uniqueId ?? "—"}</td>
                      <td className="py-2 px-3 text-slate-400">
                        {s.year != null ? `Y${s.year}` : "—"} / {s.section ?? "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {s.hostelBlock ? `${s.hostelBlock}-${s.roomNumber ?? ""}` : "Day scholar"}
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

export default function HodStudentsPage() {
  return (
    <AuthGuard allowedRoles={["hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <HodStudentsInner />
      </Suspense>
    </AuthGuard>
  );
}
