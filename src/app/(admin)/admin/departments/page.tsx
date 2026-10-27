"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2, Loader2, RefreshCw,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/admin/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface DeptRow {
  code: string;
  name: string;
  hod: string | null;
  totalStudents: number;
  facultyCount: number;
  heatmap: { y1: number; y2: number; y3: number; y4: number; le: number };
}

/**
 * Admin Departments — department structure + headcount snapshot.
 * Backend: /api/departments (open GET, admin|sysadmin writes).
 */
function AdminDepartmentsInner() {
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments", { headers: getAuthHeaders() });
      const body = await res.json();
      setRows((body?.data ?? []) as DeptRow[]);
    } catch (e) {
      console.error("departments", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Departments"
        subtitle="Department structure and headcount across campus"
        onRefresh={load}
      />

      <WidgetBoundary title="Departments">
        <div className="glass-card">
          {rows.length === 0 ? (
            <EmptyState icon={<Building2 className="w-6 h-6" />} title="No departments loaded" description="Department data is maintained on the sysadmin console." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Department</th>
                    <th className="p-3 text-left">HOD</th>
                    <th className="p-3 text-center">Faculty</th>
                    <th className="p-3 text-center">Students</th>
                    <th className="p-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r) => (
                    <tr key={r.code} className="hover:bg-[var(--bg-elevated)]/40">
                      <td className="p-3 font-mono text-xs text-[var(--text-secondary)]">{r.code}</td>
                      <td className="p-3 text-sm font-semibold text-[var(--text-primary)]">{r.name}</td>
                      <td className="p-3 text-xs text-[var(--text-muted)]">{r.hod || "—"}</td>
                      <td className="p-3 text-center">{r.facultyCount}</td>
                      <td className="p-3 text-center">{r.totalStudents}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 text-[11px] font-bold text-[var(--action-primary)]">
                          {r.facultyCount + r.totalStudents}
                        </span>
                      </td>
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

export default function AdminDepartmentsPage() {
  return (
    
      <AdminDepartmentsInner />
    
    

  );
}
