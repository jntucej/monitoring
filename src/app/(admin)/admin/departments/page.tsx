"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronRight } from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { EntityInspector, KVPairs, InspectorButton } from "@/components/shared/EntityInspector";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

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
  const [active, setActive] = useState<DeptRow | null>(null);

  /** Standardized inspection model for a department row. */
  const deptInspection = active
    ? {
        kind: "department",
        title: active.name,
        subtitle: active.code,
        status: (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-action-success">
            ACTIVE
          </span>
        ),
        sections: [
          {
            title: "Overview",
            content: (
              <KVPairs
                items={[
                  { label: "Code", value: <span className="font-mono">{active.code}</span> },
                  { label: "HOD", value: active.hod ?? "—" },
                  { label: "Faculty", value: String(active.facultyCount) },
                  { label: "Students", value: String(active.totalStudents) },
                  { label: "Total", value: String(active.facultyCount + active.totalStudents) },
                ]}
              />
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                <InspectorButton href="/sysadmin/departments" variant="primary">
                  <ChevronRight className="size-3.5" /> Manage in sysadmin
                </InspectorButton>
              </div>
            ),
          },
        ],
        detailHref: "/sysadmin/departments",
        detailLabel: "All departments",
      }
    : null;

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
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Department structure and headcount across campus"
        why="Every class, attendance log, and faculty role resolves to the department record defined here."
        contextLabel="Department structure and headcount across campus"
        statusSummary="Review current department structure and headcount across campus state and take action below."
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
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
                  <tr className="text-xs text-text-muted border-b border-border">
                    <th className="p-3 text-left">Code</th>
                    <th className="p-3 text-left">Department</th>
                    <th className="p-3 text-left">HOD</th>
                    <th className="p-3 text-center">Faculty</th>
                    <th className="p-3 text-center">Students</th>
                    <th className="p-3 text-center">Total</th>
                    <th aria-label="Inspect" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr
                      key={r.code}
                      onClick={() => setActive(r)}
                      className="hover:bg-bg-elevated/40 cursor-pointer"
                    >
                      <td className="p-3 font-mono text-xs text-text-secondary">{r.code}</td>
                      <td className="p-3 text-sm font-semibold text-text-primary">{r.name}</td>
                      <td className="p-3 text-xs text-text-muted">{r.hod || "—"}</td>
                      <td className="p-3 text-center">{r.facultyCount}</td>
                      <td className="p-3 text-center">{r.totalStudents}</td>
                      <td className="p-3 text-center">
                        <span className="surface-card px-2 py-0.5 bg-action-primary/10 text-xs font-bold text-action-primary">
                          {r.facultyCount + r.totalStudents}
                        </span>
                      </td>
                      <td className="p-3 text-text-muted"><ChevronRight className="w-4 h-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspector inspection={deptInspection} onClose={() => setActive(null)} />
    </div>
  );
}

export default function AdminDepartmentsPage() {
  return (
    
      <AdminDepartmentsInner />
    
    

  );
}
