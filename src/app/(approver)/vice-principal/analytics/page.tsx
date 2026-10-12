"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, Building2 } from "lucide-react";

interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
  totalStudents?: number;
  facultyCount?: number;
}

interface DepartmentsResponse {
  success: boolean;
  data: DepartmentRow[];
}

function VpAnalyticsInner() {
  const {
    data: departments,
    loading: deptLoading,
    refresh: refreshDepts,
  } = useApiResource<DepartmentsResponse>("/api/departments", { ttlMs: 60_000 });

  usePolling(refreshDepts, { intervalMs: 60_000, enabled: true });

  const deptList = (departments?.data ?? []) as DepartmentRow[];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Academic and Department Analytics">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Academic & Department Analytics
            </span>
          </div>
          {deptLoading && !departments ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading analytics…
            </div>
          ) : deptList.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No department data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left px-3 py-2">Department</th>
                    <th className="text-left px-3 py-2">HOD</th>
                    <th className="text-right px-3 py-2">Students</th>
                    <th className="text-right px-3 py-2">Faculty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {deptList.map((d) => (
                    <tr key={d.code} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-slate-200">{d.name}</td>
                      <td className="px-3 py-2 text-slate-400">{d.hod || "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{d.totalStudents ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{d.facultyCount ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpAnalyticsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpAnalyticsInner />
    </Suspense>
  );
}
