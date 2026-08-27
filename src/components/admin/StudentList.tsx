"use client";
import { useEffect, useState } from "react";
import { User, Search, AlertTriangle } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";

const DEPT_COLORS: Record<string, string> = {
  CSE: "bg-blue-500/20 text-blue-400",
  IT: "bg-purple-500/20 text-purple-400",
  ECE: "bg-emerald-500/20 text-emerald-400",
  EEE: "bg-amber-500/20 text-amber-400",
  ME: "bg-rose-500/20 text-rose-400",
};

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url = query.trim()
          ? `/api/students?q=${encodeURIComponent(query.trim())}`
          : "/api/students";
        const res = await fetch(url, { headers: getAuthHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setStudents(Array.isArray(json.data) ? json.data : []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    const t = setTimeout(load, 250); // debounce
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)] flex justify-between items-center gap-2">
        <div>
          <h3 className="font-semibold">All Students</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {query ? "Search results" : `Total: ${students.length}`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by roll, name, dept…"
            className="pl-9 pr-4 py-2 w-64 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">Loading…</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            {query ? "No matches" : "No students registered"}
          </div>
        ) : (
          students.slice(0, 30).map((student) => {
            const roll = student.uniqueId || student.roll || "";
            const name = student.fullName || student.name || "";
            const dept = student.department || "";
            const decoded = parseRollNumber(roll);
            const branch = decoded?.departmentFullName ?? dept ?? "—";
            const colorClass =
              (dept && DEPT_COLORS[dept]) ?? "bg-slate-500/20 text-slate-400";
            const isOnCampus = student.status === "INSIDE" || student.status === "ON_CAMPUS";
            const isWarning = student.flagStatus || student.status === "SUSPENDED";

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{roll}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">{branch}</span>
                  {isWarning && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      WRN
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isOnCampus
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {isOnCampus ? "ON CAMPUS" : "OUTSIDE"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
