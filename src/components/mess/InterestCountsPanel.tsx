"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
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

  if (loading)
    return <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading counts…</div>;
  if (error) return <div className="text-sm text-rose-300">{error}</div>;

  const itemById = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-1 pr-3">Item</th>
              <th className="py-1 pr-3">Category</th>
              <th className="py-1 pr-3">Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">
                  {it.label} <span className="font-mono text-xs text-[var(--text-muted)]">({it.code})</span>
                </td>
                <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{CAT_LABEL[it.category]}</td>
                <td className="py-1.5 pr-3 font-semibold text-[var(--text-primary)]">{it.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-1 pr-3">Student</th>
              <th className="py-1 pr-3">Roll</th>
              <th className="py-1 pr-3">Selections</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-[var(--text-muted)]">No students have registered yet.</td></tr>
            )}
            {students.map((s) => (
              <tr key={s.userId} className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{s.name}</td>
                <td className="py-1.5 pr-3 font-mono text-xs text-[var(--text-secondary)]">{s.uniqueId}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {s.itemIds.map((id) => {
                      const it = itemById.get(id);
                      return (
                        <span key={id} className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
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
