"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { SPECIAL_CATEGORIES, type SpecialItemCategory } from "@/lib/mess-reviews";

interface ItemCount {
  id: string; code: string; label: string; category: SpecialItemCategory;
  isPrimary: boolean; count: number;
}
interface StudentRow {
  userId: string; name: string; uniqueId: string; itemIds: string[];
}

const CAT_LABEL = Object.fromEntries(
  SPECIAL_CATEGORIES.map((c) => [c.value, c.label]),
) as Record<SpecialItemCategory, string>;

export function InterestCountsPanel({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ItemCount[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filterCat, setFilterCat] = useState<SpecialItemCategory | "all">("all");
  const { exportCSV } = useExport();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mess/special-events/${eventId}/interests/counts`, {
        headers: getAuthHeaders(), cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) throw new Error(body?.message ?? "Failed to load counts");
      setItems(body.data.items ?? []);
      setStudents(body.data.students ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load counts");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  const handleExport = () => {
    exportCSV(
      students.map((s) => ({
        student: s.name,
        roll: s.uniqueId,
        selections: s.itemIds.map((id) => items.find((i) => i.id === id)?.label ?? id).join("; "),
      })),
      [
        { key: "student", header: "Student" },
        { key: "roll", header: "Roll" },
        { key: "selections", header: "Items" },
      ],
      `interest_event_${eventId}.csv`
    );
  };

  if (loading)
    return <div className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading counts…</div>;
  if (error) return <div className="text-sm text-action-danger">{error}</div>;

  const itemById = new Map(items.map((i) => [i.id, i]));
  const filteredItems = filterCat === "all" ? items : items.filter((i) => i.category === filterCat);
  const filteredStudents = filterCat === "all"
    ? students
    : students.filter((s) => s.itemIds.some((id) => itemById.get(id)?.category === filterCat));

  return (
    <div className="space-y-3">
      {/* Category filter + export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {(["all", ...SPECIAL_CATEGORIES.map((c) => c.value)] as Array<SpecialItemCategory | "all">).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                filterCat === cat
                  ? "bg-action-primary text-white"
                  : "bg-bg-elevated text-text-secondary hover:bg-bg-surface"
              }`}
            >
              {cat === "all" ? "All" : CAT_LABEL[cat]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={students.length === 0}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
        >
          <FileDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="py-1 pr-3">Item</th>
              <th className="py-1 pr-3">Category</th>
              <th className="py-1 pr-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="py-1.5 pr-3 text-text-primary">
                  {it.label} <span className="font-mono text-xs text-text-muted">({it.code})</span>
                </td>
                <td className="py-1.5 pr-3 text-text-secondary">{CAT_LABEL[it.category]}</td>
                <td className="py-1.5 pr-3 font-semibold text-text-primary">{it.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-muted">
              <th className="py-1 pr-3">Student</th>
              <th className="py-1 pr-3">Roll</th>
              <th className="py-1 pr-3">Selections</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-text-muted">No students have registered yet.</td></tr>
            )}
            {filteredStudents.map((s) => (
              <tr key={s.userId} className="border-t border-border">
                <td className="py-1.5 pr-3 text-text-primary">{s.name}</td>
                <td className="py-1.5 pr-3 font-mono text-xs text-text-secondary">{s.uniqueId}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {s.itemIds.map((id) => {
                      const it = itemById.get(id);
                      return (
                        <span key={id} className={`surface-card px-2 py-0.5 text-xs ${filterCat === "all" || it?.category === filterCat ? "text-text-secondary" : "opacity-40"}`}>
                          {it?.label ?? id}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
