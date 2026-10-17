"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layers, Plus, RefreshCw, Save, Loader2, Search, X, Building2, Users,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";

interface Dept {
  id: string;
  code: string;
  name: string;
}
interface ClassRow {
  id: string;
  departmentId: string;
  year: number;
  section: string;
  name: string | null;
  classTeacherId: string | null;
  roomNumber: string | null;
  capacity: number | null;
  isActive: boolean;
}
interface NewClass {
  departmentId: string;
  year: string;
  section: string;
  name: string;
  roomNumber: string;
  capacity: string;
}

async function fetchClasses(): Promise<ClassRow[]> {
  const res = await fetch("/api/classes", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as ClassRow[];
}

async function fetchDepartments(): Promise<Dept[]> {
  const res = await fetch("/api/departments", { headers: getAuthHeaders() });
  const body = await res.json();
  return (body?.data ?? body ?? []) as Dept[];
}

/**
 * Admin Classes — manage (department, year, section) teaching groups.
 * Backend: /api/classes (hod|admin|sysadmin scope). No UI existed anywhere.
 */
function AdminClassesInner() {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NewClass>({
    departmentId: "", year: "", section: "", name: "", roomNumber: "", capacity: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([fetchClasses(), fetchDepartments()]);
      setRows(c);
      setDepts(d);
    } catch (e) {
      console.error("classes", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    const deptName = (id: string) => depts.find((d) => d.id === id)?.name ?? id;
    return rows.filter((r) =>
      `${r.departmentId} ${deptName(r.departmentId)} ${r.year} ${r.section} ${r.name ?? ""}`.toLowerCase().includes(q)
    );
  }, [rows, query, depts]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.departmentId || !draft.year || !draft.section) return;
    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: draft.departmentId,
          year: Number(draft.year),
          section: draft.section,
          name: draft.name || undefined,
          roomNumber: draft.roomNumber || undefined,
          capacity: draft.capacity ? Number(draft.capacity) : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDraft({ departmentId: "", year: "", section: "", name: "", roomNumber: "", capacity: "" });
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const deptName = (id: string) => depts.find((d) => d.id === id)?.name ?? id;

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
      <PageHeader title="Classes" subtitle="Teaching groups by department, year, and section" onRefresh={load} />

      <WidgetBoundary title="Create class">
        <form onSubmit={create} className="glass-card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <label className="block col-span-2 md:col-span-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Department</span>
            <select
              value={draft.departmentId}
              onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm"
              required
            >
              <option value="">Select</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Year</span>
            <input type="number" min="1" max="10" value={draft.year} onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
              placeholder="1" required className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Section</span>
            <input value={draft.section} onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
              placeholder="A" required className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Room</span>
            <input value={draft.roomNumber} onChange={(e) => setDraft((d) => ({ ...d, roomNumber: e.target.value }))}
              placeholder="B101" className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Capacity</span>
            <input type="number" min="0" value={draft.capacity} onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value }))}
              placeholder="60" className="w-full px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-sm" />
          </label>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--action-primary)] text-white text-xs font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
          </button>
        </form>
      </WidgetBoundary>

      <WidgetBoundary title="Class list">
        <div className="glass-card">
          <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--action-primary)]" />
            <span className="text-sm font-semibold">{filtered.length} classes</span>
            <div className="ml-auto relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…"
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-xs w-40" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Year</th>
                  <th className="p-3 text-left">Section</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Room</th>
                  <th className="p-3 text-left">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-[var(--text-muted)]">No classes yet.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-elevated)]/40">
                    <td className="p-3 text-[var(--text-primary)]">{deptName(r.departmentId)}</td>
                    <td className="p-3 tabular-nums">{r.year}</td>
                    <td className="p-3 font-medium">{r.section}</td>
                    <td className="p-3 text-[var(--text-muted)]">{r.name ?? "—"}</td>
                    <td className="p-3 text-[var(--text-muted)]">{r.roomNumber ?? "—"}</td>
                    <td className="p-3 tabular-nums">{r.capacity ?? "—"}</td>
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

export default function AdminClassesPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminClassesInner />
    </AuthGuard>
  );
}
