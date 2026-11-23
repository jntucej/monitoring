"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Plus, Loader2, Search, ChevronRight } from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { usePersistentQuery } from "@/hooks/usePersistentQuery";
import { EntityInspector, KVPairs, InspectorButton } from "@/components/shared/EntityInspector";

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
  const [query, setQuery] = usePersistentQuery("gate-admin-classes-query");
  const [draft, setDraft] = useState<NewClass>({
    departmentId: "", year: "", section: "", name: "", roomNumber: "", capacity: "",
  });
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<ClassRow | null>(null);

  const deptName = (id: string) => depts.find((d) => d.id === id)?.name ?? id;

  /** Standardized inspection model for a class row (overview → actions).
   *  Built lazily so it can reference `deptName`, which depends on the
   *  loaded `depts` list. */
  const classInspection = active
    ? {
        kind: "class",
        title: active.name ?? `${deptName(active.departmentId)} ${active.year} ${active.section}`,
        subtitle: `${active.year} · ${active.section}`,
        status: (
          <span
            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
              active.isActive
                ? "bg-emerald-500/15 text-action-success"
                : "bg-bg-elevated text-text-muted"
            }`}
          >
            {active.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        ),
        sections: [
          {
            title: "Overview",
            content: (
              <KVPairs
                items={[
                  { label: "Department", value: deptName(active.departmentId) },
                  { label: "Year", value: String(active.year) },
                  { label: "Section", value: active.section },
                  ...(active.roomNumber ? [{ label: "Room", value: active.roomNumber }] : []),
                  ...(active.capacity ? [{ label: "Capacity", value: String(active.capacity) }] : []),
                ]}
              />
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                <InspectorButton href="/admin/classes" variant="primary">
                  <ChevronRight className="size-3.5" /> All classes
                </InspectorButton>
              </div>
            ),
          },
        ],
      }
    : null;

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

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-4 md:py-6">
      <PageHeader title="Classes" subtitle="Teaching groups by department, year, and section" onRefresh={load} />

      <WidgetBoundary title="Create class">
        <form onSubmit={create} className="surface-card p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <label className="block sm:col-span-2 md:col-span-1">
            <span className="text-xs font-semibold text-text-secondary block mb-1">Department</span>
            <select
              value={draft.departmentId}
              onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value }))}
              className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm"
              required
            >
              <option value="">Select</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-text-secondary block mb-1">Year</span>
            <input type="number" min="1" max="10" value={draft.year} onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
              placeholder="1" required className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-text-secondary block mb-1">Section</span>
            <input value={draft.section} onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
              placeholder="A" required className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-text-secondary block mb-1">Room</span>
            <input value={draft.roomNumber} onChange={(e) => setDraft((d) => ({ ...d, roomNumber: e.target.value }))}
              placeholder="B101" className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-text-secondary block mb-1">Capacity</span>
            <input type="number" min="0" value={draft.capacity} onChange={(e) => setDraft((d) => ({ ...d, capacity: e.target.value }))}
              placeholder="60" className="surface-card w-full min-h11 px-3 py-2 bg-bg-elevated text-sm" />
          </label>
          <button type="submit" disabled={saving}
            className="surface-card inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h11 bg-action-primary text-white text-xs font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
          </button>
        </form>
      </WidgetBoundary>

      <WidgetBoundary title="Class list">
        <div className="glass-card">
          <div className="surface-card p-4 flex flex-wrap items-center gap-2">
            <Layers className="w-4 h-4 text-action-primary" />
            <span className="text-sm font-semibold">{filtered.length} classes</span>
            <div className="ml-auto relative min-w40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter…"
                className="surface-card pl-8 pr-3 py-1.5 min-h11 bg-bg-elevated text-xs w-full sm:w-40" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-text-muted border-b border-border">
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Year</th>
                  <th className="p-3 text-left">Section</th>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Room</th>
                  <th className="p-3 text-left">Capacity</th>
                  <th aria-label="Inspect" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-text-muted">No classes yet.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setActive(r)}
                    className="hover:bg-bg-elevated/40 cursor-pointer"
                  >
                    <td className="p-3 text-text-primary">{deptName(r.departmentId)}</td>
                    <td className="p-3 tabular-nums">{r.year}</td>
                    <td className="p-3 font-medium">{r.section}</td>
                    <td className="p-3 text-text-muted">{r.name ?? "—"}</td>
                    <td className="p-3 text-text-muted">{r.roomNumber ?? "—"}</td>
                    <td className="p-3 tabular-nums">{r.capacity ?? "—"}</td>
                    <td className="p-3 text-text-muted"><ChevronRight className="w-4 h-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </WidgetBoundary>

      <EntityInspector inspection={classInspection} onClose={() => setActive(null)} />
    </div>
  );
}

export default function AdminClassesPage() {
  return (
    
      <AdminClassesInner />
    
    

  );
}
