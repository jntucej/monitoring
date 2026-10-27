"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, GraduationCap, Briefcase, Grid, Lock, ArrowRight } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import Link from "next/link";

interface DepartmentData {
  code: string;
  name: string;
  hod: string;
  totalStudents: number;
  facultyCount: number;
  heatmap?: { y1: number, y2: number, y3: number, y4: number, le: number };
}

export default function AdminUsersPage() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [activeTab, setActiveTab] = useState<"roles" | "heatmap">("roles");

  const loadDepartments = async () => {
    setLoadingDepts(true);
    try {
      const res = await fetch("/api/departments", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const processedDepts = json.data.map((d: any) => ({
          ...d,
          heatmap: d.heatmap || { y1: 0, y2: 0, y3: 0, y4: 0, le: 0 }
        }));
        setDepartments(processedDepts);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingDepts(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  const totalStudentCount = useMemo(
    () => departments.reduce((acc, curr) => acc + (curr.totalStudents || 0), 0),
    [departments]
  );

  const getHeatmapColor = (count: number) => {
    if (count > 100) return "bg-blue-600 text-white font-bold";
    if (count > 70) return "bg-blue-500/80 text-white font-semibold";
    if (count > 45) return "bg-blue-500/40 text-blue-200 font-medium";
    if (count > 20) return "bg-blue-500/20 text-blue-300";
    return "bg-blue-500/10 text-blue-400";
  };

  return (
    
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[var(--text-muted)]">
            Staff & admin account directory, HOD oversight, branch student & faculty density heatmaps
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === "heatmap" ? "roles" : "heatmap")}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--action-primary)] text-white text-xs font-semibold hover:brightness-110 transition flex items-center gap-1.5"
          >
            <Grid className="w-3.5 h-3.5" />
            {activeTab === "heatmap" ? "View Role Directory" : "View Branch Heatmaps"}
          </button>
        </div>
      </div>

      {activeTab === "heatmap" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-400" /> Students Enrolled
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {loadingDepts ? "..." : totalStudentCount}
              </div>
            </div>
            <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Total Faculty
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {loadingDepts ? "..." : departments.reduce((acc, curr) => acc + (curr.facultyCount || 0), 0)}
              </div>
            </div>
            <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border)]">
              <div className="text-xs text-[var(--text-muted)] font-semibold uppercase mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Active Branches
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {loadingDepts ? "..." : departments.length}
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
            <h3 className="font-semibold text-sm mb-4 text-[var(--text-primary)]">Year-wise Branch Density (Headcount Matrix)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse min-w-[650px]">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="p-2 text-left w-1/4 uppercase tracking-wider font-semibold text-[10px]">Branch / Department</th>
                    <th className="p-2 uppercase tracking-wider font-semibold text-[10px]">Current HOD</th>
                    <th className="p-2 uppercase tracking-wider font-semibold text-[10px]">Yr 1</th>
                    <th className="p-2 uppercase tracking-wider font-semibold text-[10px]">Yr 2</th>
                    <th className="p-2 uppercase tracking-wider font-semibold text-[10px]">Yr 3</th>
                    <th className="p-2 uppercase tracking-wider font-semibold text-[10px]">Yr 4</th>
                    <th className="p-2 uppercase tracking-wider font-semibold text-[10px]">LE</th>
                    <th className="p-2 text-right uppercase tracking-wider font-semibold text-[10px]">Base Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-primary)] font-mono">
                  {loadingDepts ? (
                    <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">Loading departments...</td></tr>
                  ) : departments.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">No departments mapped</td></tr>
                  ) : (
                    departments.map(dept => (
                      <tr key={dept.code} className="hover:bg-white/5 transition">
                        <td className="p-2 text-left font-sans">
                          <span className="font-bold block text-sm">{dept.code}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{dept.name}</span>
                        </td>
                        <td className="p-2 text-[var(--text-secondary)] font-sans">{dept.hod}</td>
                        <td className="p-2">
                          <div className={`py-2 px-3 rounded-lg ${getHeatmapColor(dept.heatmap!.y1)}`}>
                            {dept.heatmap!.y1}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className={`py-2 px-3 rounded-lg ${getHeatmapColor(dept.heatmap!.y2)}`}>
                            {dept.heatmap!.y2}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className={`py-2 px-3 rounded-lg ${getHeatmapColor(dept.heatmap!.y3)}`}>
                            {dept.heatmap!.y3}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className={`py-2 px-3 rounded-lg ${getHeatmapColor(dept.heatmap!.y4)}`}>
                            {dept.heatmap!.y4}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className={`py-2 px-3 rounded-lg ${getHeatmapColor(dept.heatmap!.le * 10)}`}>
                            {dept.heatmap!.le}
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {dept.totalStudents} <span className="text-[10px] font-normal text-[var(--text-muted)] block">{dept.facultyCount} faculty</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 text-xs text-[var(--text-muted)] pt-2">
              <span>Density Legend:</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">Low (&lt;30)</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/40 text-blue-200">Medium (30-70)</span>
              <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">High (&gt;100)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {loadingDepts ? "..." : totalStudentCount.toLocaleString()} students on roster
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Student accounts are hidden from this view — the full roster lives at /admin/students
                </div>
              </div>
            </div>
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-white/5 transition"
            >
              Open student roster
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <UserManagementPanel />

          {/* Role-change guidance — grant/revoke lives on the sysadmin
              console (/api/admin/users/[id]/roles). Admins can view
              assignments but privilege changes are sysadmin-gated. */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Role changes require sysadmin</p>
              <p className="mt-1 text-xs text-slate-400">
                Granting or revoking roles (including <code className="text-[11px]">sysadmin</code>
                escalation) runs through the sysadmin console — <Link href="/admin/roles" className="text-emerald-400 hover:underline">view the role hierarchy</Link>{" "}
                for the assignment map. If an account's role looks out of date, contact the platform team.
              </p>
            </div>
          </div>

          <DevContactStrip />
        </div>
      )}
    </div>
    
    

  );
}
