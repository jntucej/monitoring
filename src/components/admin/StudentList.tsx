"use client";
import { useEffect, useState } from "react";
import { User, Search, AlertTriangle } from "lucide-react";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";
import { motion } from "framer-motion";
import { useGlossyMotion, staggerContainer, fadeInUp } from "@/lib/animations";
import { useApi } from "@/hooks/useApi";

const DEPT_COLORS: Record<string, string> = {
  CSE: "bg-blue-500/20 text-action-primary",
  IT: "bg-purple-500/20 text-unit-c",
  ECE: "bg-emerald-500/20 text-action-success",
  EEE: "bg-amber-500/20 text-action-warning",
  ME: "bg-rose-500/20 text-action-danger",
};

export function StudentList() {
const api = useApi();

  const [students, setStudents] = useState<Student[]>([]);
  const isGlossyMotion = useGlossyMotion();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url = query.trim()
          ? `/api/students?q=${encodeURIComponent(query.trim())}`
          : "/api/students";
        const res = await fetch(url, { headers: api.getHeaders(), cache: "no-store" });
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
    <div className="bg-bg-surface rounded-xl border border-border">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">All Students</h3>
          <p className="text-xs text-text-muted">
            {query ? "Search results" : `Total: ${students.length}`}
          </p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by roll, name, dept…"
            className="pl-9 pr-4 py-2 w-full sm:w-56 bg-bg-base border border-border rounded-lg text-sm"
          />
        </div>
      </div>
      <motion.div
        variants={isGlossyMotion ? staggerContainer : {}}
        initial={isGlossyMotion ? "hidden" : false}
        animate={isGlossyMotion ? "visible" : undefined}
        className="p-4 space-y-2 max-h-96 overflow-y-auto overscroll-y-contain card-list-wrapper"
      >
        {loading ? (
          <div className="text-center py-8 text-text-muted text-sm">Loading…</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
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
              (dept && DEPT_COLORS[dept]) ?? "bg-bg-elevated/20 text-text-muted";
            const sAny = student as any;
            const isOnCampus = sAny.campusStatus === "IN" || sAny.movementStatus === "IN" || student.status === "INSIDE" || student.status === "ON_CAMPUS" || student.status === "IN" || (Boolean(sAny.checkedInAt) && !Boolean(sAny.checkedOutAt));
            const isWarning = student.flagStatus || student.status === "SUSPENDED";

            return (
              <motion.div
                variants={isGlossyMotion ? fadeInUp : {}}
                key={student.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-text-muted font-mono">{roll}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary hidden sm:inline">{branch}</span>
                  {isWarning && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-action-danger border border-rose-500/40 animate-pulse flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      WRN
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isOnCampus
                        ? "bg-emerald-500/10 text-action-success border border-emerald-500/20"
                        : "bg-bg-elevated/10 text-text-muted border border-border/20"
                    }`}
                  >
                    {isOnCampus ? "ON CAMPUS" : "OUTSIDE"}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
