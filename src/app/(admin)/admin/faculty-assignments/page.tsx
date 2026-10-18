"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link2, Plus, RefreshCw, Trash2, Search, Loader2,
} from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface FacultyAssignment {
  id: string;
  facultyId: string;
  classId: string;
  subjectCode: string;
  role: "class_teacher" | "subject_faculty" | "assistant";
  assignedBy: string | null;
  assignedAt: string;
  isActive: boolean;
}
interface FacultyUser {
  id: string;
  name: string;
  email: string | null;
}
interface ClassRow {
  id: string;
  year: number;
  section: string;
  departmentId: string;
  name: string | null;
}
interface SubjectRow {
  code: string;
  label: string;
}

async function fetchAssignments(): Promise<FacultyAssignment[]> {
  const res = await fetch("/api/faculty-assignments", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as FacultyAssignment[];
}
async function fetchFaculty(): Promise<FacultyUser[]> {
  const res = await fetch("/api/faculty", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as FacultyUser[];
}
async function fetchClasses(): Promise<ClassRow[]> {
  const res = await fetch("/api/classes", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as ClassRow[];
}
async function fetchSubjects(): Promise<SubjectRow[]> {
  const res = await fetch("/api/config/subjects", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as SubjectRow[];
}

/**
 * Admin Faculty Assignments — assign faculty to classes/subjects.
 * Backend: /api/faculty-assignments (hod|faculty|admin|sysadmin). No UI anywhere.
 */
function AdminFacultyAssignmentsInner() {
  const [rows, setRows] = useState<FacultyAssignment[]>([]);
  const [faculty, setFaculty] = useState<FacultyUser[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    facultyId: "", classId: "", subjectCode: "", role: "subject_faculty",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, f, c, s] = await Promise.all([
        fetchAssignments(), fetchFaculty(), fetchClasses(), fetchSubjects(),
      ]);
      setRows(a);
      setFaculty(f);
      setClasses(c);
      setSubjects(s);
    } catch (e) {
      console.error("faculty-assignments", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const facultyName = (id: string) => faculty.find((f) => f.id === id)?.name ?? id.slice(0, 8);
  const className = (id: string) => {
    const c = classes.find((x) => x.id === id);
    return c ? `Y${c.year} ${c.section}` : id.slice(0, 8);
  };
  const subjectLabel = (code: string) => subjects.find((s) => s.code === code)?.label ?? code;

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      `${facultyName(r.facultyId)} ${className(r.classId)} ${subjectLabel(r.subjectCode)} ${r.role}`.toLowerCase().includes(q)
    );
  }, [rows, query, faculty, classes, subjects]);

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.facultyId || !draft.classId || !draft.subjectCode) return;
    setSaving(true);
    try {
      const res = await fetch("/api/faculty-assignments", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyId: draft.facultyId,
          classId: draft.classId,
          subjectCode: draft.subjectCode,
          role: draft.role,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) load();
    } finally {
      setSaving(false);
    }
  };

  const unassign = async (id: string) => {
    const res = await fetch(`/api/faculty-assignments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (res.ok) load();
  };

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
        title="Faculty Assignments"
        subtitle="Assign faculty to classes and subjects"
        onRefresh={load}
      />

      <WidgetBoundary title="New assignment">
        <form onSubmit={assign} className="glass-card p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Faculty</span>
            <select
              value={draft.facultyId}
              onChange={(e) => setDraft((d) => ({ ...d, facultyId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm"
              required
            >
              <option value="">Select</option>
              {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Class</span>
            <select
              value={draft.classId}
              onChange={(e) => setDraft((d) => ({ ...d, classId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm"
              required
            >
              <option value="">Select</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Y{c.year} {c.section}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Subject</span>
            <select
              value={draft.subjectCode}
              onChange={(e) => setDraft((d) => ({ ...d, subjectCode: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm"
              required
            >
              <option value="">Select</option>
              {subjects.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Role</span>
            <select
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as FacultyAssignment["role"] }))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm"
            >
              <option value="subject_faculty">Subject faculty</option>
              <option value="assistant">Assistant</option>
            </select>
          </label>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--action-primary)] text-white text-xs font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Assign
          </button>
        </form>
      </WidgetBoundary>

      <WidgetBoundary title="Assignment list">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[var(--action-primary)]" />
            <span className="text-sm font-semibold">{filtered.length} assignments</span>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="p-3 text-left">Faculty</th>
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-left">Subject</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No assignments.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                    <td className="p-3 text-[var(--text-primary)]">{facultyName(r.facultyId)}</td>
                    <td className="p-3">{className(r.classId)}</td>
                    <td className="p-3 text-[var(--text-muted)]">{subjectLabel(r.subjectCode)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] capitalize">
                        {r.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] ${r.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {r.isActive ? "Active" : "Off"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => unassign(r.id)} aria-label="Unassign"
                        className="text-[var(--text-muted)] hover:text-[var(--action-danger)] transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function AdminFacultyAssignmentsPage() {
  return (
    
      <AdminFacultyAssignmentsInner />
    
    

  );
}
