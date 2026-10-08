"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { User, Search, RefreshCw, GraduationCap, Ban, AlertTriangle } from "lucide-react";
import { parseRollNumber, getStudentYearFromRoll } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { useLiveRefresh } from "@/hooks/useLiveRefresh"
import { CampusStatusBar } from "@/components/admin/CampusStatusBar";
import { StudentInfographics } from "@/components/admin/StudentInfographics";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const loadStudents = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = q?.trim()
        ? `/api/students?q=${encodeURIComponent(q.trim())}`
        : "/api/students";
      const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      console.log("[Students Page] API Response:", { success: json.success, data_type: typeof json.data, is_array: Array.isArray(json.data), count: Array.isArray(json.data) ? json.data.length : 0 });
      if (Array.isArray(json.data)) {
        setStudents(json.data);
        console.log("[Students Page] Loaded students:", json.data.length, "First student:", json.data[0]);
      } else {
        const msg = typeof json.error === "string" ? json.error : json.error?.message || "Failed to load roster";
        setError(msg);
        console.error("[Students Page] Error:", msg);
      }
    } catch (e: any) {
      const msg = e?.message || "Network error";
      setError(msg);
      console.error("[Students Page] Fetch error:", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadStudents(query), 250);
    return () => clearTimeout(t);
  }, [query, loadStudents]);

  // Live toggle also refetches when flipped back on.
  useLiveRefresh(() => loadStudents(query), {});

  const patchUser = useCallback(async (id: string, patch: Record<string, unknown>) => {
    setPending(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStudents(prev => prev.map(s => s.id === id ? { ...s, ...json.data } : s));
      }
    } catch (e) {
      console.error("patchUser error:", e);
    } finally {
      setPending(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  }, []);

  const toggleFlag = useCallback((student: Student) => {
    const cur = (student as any).flagStatus ?? null;
    const next = cur ? null : "MANUAL_LOCKDOWN";
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, flagStatus: next } as any : s));
    patchUser(student.id, { flagStatus: next });
  }, [patchUser]);

  const toggleSuspend = useCallback((student: Student) => {
    const next = student.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: next } : s));
    patchUser(student.id, { status: next });
  }, [patchUser]);

  const filteredStudents = useMemo(() => students.filter(s => {
    const roll = s.uniqueId || s.roll || "";
    const dept = (s.department || "").toUpperCase();
    // Get year from roll number or database, with proper null handling
    const yearFromRoll = getStudentYearFromRoll(roll);
    const yearStr = (yearFromRoll || s.year || "").toString();
    
    // Branch filter - handle empty department
    if (selectedBranch !== "ALL" && dept && !dept.includes(selectedBranch)) return false;
    
    // Year filter - handle empty year
    if (selectedYear !== "ALL") {
      if (selectedYear === "LE") {
        // Lateral entry: check roll number for "LE" or "5A"
        if (!roll.toUpperCase().includes("LE") && !roll.toUpperCase().includes("5A")) return false;
      } else if (yearStr && !yearStr.includes(selectedYear)) {
        return false;
      }
    }
    return true;
  }), [students, selectedBranch, selectedYear]);


  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <CampusStatusBar />
      <div className="space-y-6 p-6">
        <StudentInfographics />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-400" />
            Registered Students &amp; Roster
          </h1>
          <p className="text-[var(--text-muted)]">
            {loading
              ? "Loading roster…"
              : `${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"} listed (${students.length} total)`}
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or roll…"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm focus:outline-none">
          {["ALL","CSE","IT","ECE","EEE","ME"].map(b => (
            <option key={b} value={b}>{b === "ALL" ? "All Branches" : b}</option>
          ))}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm focus:outline-none">
          {[["ALL","All Years"],["1","1st Year"],["2","2nd Year"],["3","3rd Year"],["4","4th Year"],["LE","Lateral Entry"]].map(([v,l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>
      )}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Roll</th>
                <th className="p-4 font-medium">Branch</th>
                <th className="p-4 font-medium">Year</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">Loading…</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                  {query ? "No matches" : "No students registered yet"}
                </td></tr>
              ) : filteredStudents.map(student => {
                const decoded = parseRollNumber(student.roll);
                const branch = decoded?.departmentFullName ?? student.department ?? "—";
                // Try to get year from roll number first, then fall back to database year
                const yearFromRoll = getStudentYearFromRoll(student.roll);
                const year = yearFromRoll ?? student.year ?? "—";
                const isSuspended = student.status === "SUSPENDED";
                const isFlagged = !!(student as any).flagStatus;
                const isBusy = !!pending[student.id];
                return (
                  <tr key={student.id} className="hover:bg-white/5">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[var(--text-muted)]">{student.roll}</td>
                    <td className="p-4">{branch}</td>
                    <td className="p-4">{year}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        isSuspended ? "bg-rose-500/10 text-rose-400"
                        : isFlagged  ? "bg-amber-500/10 text-amber-400"
                        : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {isSuspended ? "Suspended" : isFlagged ? "Flagged" : "Active"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleFlag(student)} disabled={isBusy}
                          title={isFlagged ? "Remove flag" : "Flag as suspicious"}
                          className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${
                            isFlagged ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                            : "text-[var(--text-muted)] hover:bg-amber-500/10 hover:text-amber-400"}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleSuspend(student)} disabled={isBusy}
                          title={isSuspended ? "Lift suspension" : "Suspend student"}
                          className={`p-1.5 rounded-lg transition-all disabled:opacity-40 ${
                            isSuspended ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                            : "text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-400"}`}>
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
