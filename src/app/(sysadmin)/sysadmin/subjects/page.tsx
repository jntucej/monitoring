"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, Search, RefreshCw, Building2,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface Subject {
  code: string;
  label: string;
  departmentId: string | null;
  color: string;
  sortOrder: number;
  isActive: boolean;
}
interface Dept {
  id: string;
  code: string;
  name: string;
}

async function fetchSubjects(): Promise<Subject[]> {
  const res = await fetch("/api/config/subjects", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as Subject[];
}

async function fetchDepartments(): Promise<Dept[]> {
  const res = await fetch("/api/departments", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as Dept[];
}

/**
 * Admin Subjects — subject catalog viewer. The backend exposes GET
 * /api/config/subjects only (admin|faculty|hod scope), so this is a read-only
 * catalog grouped by department. No UI existed anywhere before this.
 */
function AdminSubjectsInner() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([fetchSubjects(), fetchDepartments()]);
      setSubjects(s);
      setDepts(d);
    } catch (e) {
      console.error("subjects", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deptName = (id: string | null) =>
    depts.find((d) => d.id === id)?.name ?? (id ? id : "All Departments");

  const grouped = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q
      ? subjects.filter((s) => `${s.code} ${s.label} ${deptName(s.departmentId)}`.toLowerCase().includes(q))
      : subjects;
    const byDept = new Map<string, Subject[]>();
    for (const s of filtered) {
      const key = s.departmentId ?? "__all__";
      (byDept.get(key) ?? byDept.set(key, []).get(key)!).push(s);
    }
    return Array.from(byDept.entries());
  }, [subjects, query, depts]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Subjects"
        subtitle="Subject catalog across departments (read-only)"
        onRefresh={load}
      />

      <WidgetBoundary title="Subject catalog">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--action-primary)]" />
            <span className="text-sm font-semibold">{subjects.length} subjects</span>
            <div className="ml-auto relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter…"
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs w-40"
              />
            </div>
          </div>
          <div className="p-4 space-y-4">
            {grouped.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No subjects found.</p>
            )}
            {grouped.map(([deptKey, list]) => (
              <div key={deptKey}>
                <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <Building2 className="w-3.5 h-3.5" />
                  {deptName(deptKey === "__all__" ? null : deptKey)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {list.map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color || "var(--action-primary)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.label}</p>
                        <p className="text-xs font-mono text-[var(--text-muted)]">{s.code}</p>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{s.isActive ? "Active" : "Off"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function AdminSubjectsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminSubjectsInner />
    </AuthGuard>
  );
}
