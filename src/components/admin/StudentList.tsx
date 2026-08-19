"use client";
import { useEffect, useState } from "react";
import { User, Search } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";

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
        const res = await fetch(url, { cache: "no-store" });
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by roll, name, dept…"
            className="pl-10 pr-4 py-2 w-64 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
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
            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-[var(--text-muted)] font-mono">{roll}</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{branch}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
