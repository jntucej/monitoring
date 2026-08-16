"use client";
import { useEffect, useState } from "react";
import { User, Search, UserPlus } from "lucide-react";
import { parseRollNumber, getStudentYearFromRoll } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";

export default function AdminStudentsPage() {
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
    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-[var(--text-muted)]">
            {loading ? "Loading…" : `${students.length} student${students.length === 1 ? "" : "s"} registered`}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--action-primary)] text-white hover:brightness-110">
          <UserPlus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center gap-2">
          <h3 className="font-semibold">All Students</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              className="pl-10 pr-4 py-2 w-64 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Roll No</th>
                <th className="p-4 font-medium">Branch</th>
                <th className="p-4 font-medium">Year</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading…</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                  {query ? "No matches" : "No students registered yet"}
                </td></tr>
              ) : (
                students.map((student) => {
                  const decoded = parseRollNumber(student.roll);
                  const branch = decoded?.departmentFullName ?? student.department ?? "—";
                  const year = getStudentYearFromRoll(student.roll) ?? student.year ?? "—";
                  const active = (student.status ?? "active").toLowerCase() === "active";
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
                          active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
