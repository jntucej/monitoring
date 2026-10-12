"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useEffect, useMemo, useState } from "react";
import { Users, Shield, GraduationCap, Briefcase, UserCheck, Grid, Search, ArrowRight } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  isHod?: boolean;
}

interface DepartmentData {
  code: string;
  name: string;
  hod: string;
  totalStudents: number;
  facultyCount: number;
  heatmap?: { y1: number, y2: number, y3: number, y4: number, le: number };
}

export default function AdminUsersPage() {
const api = useApi();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "heatmap">("roles");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadUsers = async (q = "") => {
    setLoading(true);
    setSearching(!!q.trim());
    setError(null);
    try {
      const url = q.trim() ? `/api/users?q=${encodeURIComponent(q.trim())}` : "/api/users";
      const res = await fetch(url, { headers: api.getHeaders(), cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
        setHasSearched(!!q.trim());
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Failed to load user roles";
        setError(msg);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    setLoadingDepts(true);
    try {
      const res = await fetch("/api/departments", { headers: api.getHeaders(), cache: "no-store" });
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
    loadUsers();
    loadDepartments();
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) loadUsers(value);
    else loadUsers();
  };

  const totalStudentCount = useMemo(
    () => departments.reduce((acc, curr) => acc + (curr.totalStudents || 0), 0),
    [departments]
  );

  const studentAccounts = useMemo(() => users.filter((u) => u.role?.toLowerCase() === "student"), [users]);
  const nonStudentAccounts = useMemo(() => users.filter((u) => u.role?.toLowerCase() !== "student"), [users]);
  const shownAccounts = hasSearched ? users : nonStudentAccounts;

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Roles & Branch Heatmaps
          </h1>
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
          {!hasSearched && (
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
          )}

          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                {hasSearched ? "Search Results" : "Staff & Admin Accounts"}
              </h3>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search name, roll, email, or role…"
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg pl-9 pr-9 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {(query || searching) && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setHasSearched(false);
                      loadUsers();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {hasSearched && !searching && (
              <div className="px-4 py-2 text-xs text-[var(--text-muted)] bg-white/5">
                {users.length} account{users.length === 1 ? "" : "s"} matching “{query}”
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)] bg-white/5">
                    <th className="p-4 font-medium">User Profile</th>
                    <th className="p-4 font-medium">Assigned Role</th>
                    <th className="p-4 font-medium">Department</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {error ? (
                    <tr><td colSpan={4} className="p-8 text-center text-red-400">{error}</td></tr>
                  ) : searching ? (
                    <tr><td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">Searching…</td></tr>
                  ) : hasSearched && users.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No accounts match “{query}”</td></tr>
                  ) : loading && !hasSearched ? (
                    <tr><td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">Loading users…</td></tr>
                  ) : !hasSearched && shownAccounts.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">No non-student accounts found</td></tr>
                  ) : (
                    shownAccounts.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="p-4 font-medium">
                          {u.name || u.email}
                          {u.email && u.name && u.email !== u.name && (
                            <span className="block text-xs text-[var(--text-muted)]">{u.email}</span>
                          )}
                        </td>
                        <td className="p-4 uppercase text-xs font-semibold text-purple-400">{u.role}</td>
                        <td className="p-4 text-xs text-[var(--text-muted)]">{u.department || "All Campus"}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 font-medium">
                            {u.status || "ACTIVE"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
