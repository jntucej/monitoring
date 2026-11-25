"use client";

/**
 * MenuEditor — the mess_incharge weekly-menu planning editor.
 *
 * Blueprint-driven: it lists the week's `mess_weekly_items`, lets the
 * in-charge add a catalog dish to a day/meal, mark items `is_new` (which
 * opens an interest poll), and publish the week. It fetches
 * GET /api/mess/menus?week_start= and acts via the existing
 * /api/mess/menu-items + /api/mess/menu/[id]/publish endpoints.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Send, Loader2, AlertTriangle, Flame } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface WeeklyMenu {
  id: string;
  week_start: string;
  version: number;
  status: "draft" | "published" | "superseded";
  items: Array<{
    id: string;
    catalog_item_id: string;
    day_of_week: number;
    meal_type: string;
    item_name: string;
    category: string;
    is_new: boolean;
    status: string;
  }>;
}

interface CatalogItem {
  id: string;
  code: string;
  label: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MenuEditor({ weekStart }: { weekStart?: string }) {
  const [week, setWeek] = useState<string>(weekStart ?? new Date().toISOString().slice(0, 10));
  const [newItem, setNewItem] = useState({ catalogItemId: "", dayOfWeek: 1, mealType: "lunch", isNew: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const url = useMemo(
    () => `/api/mess/menus?week_start=${encodeURIComponent(week)}`,
    [week]
  );
  const { data, refresh } = useApiResource<WeeklyMenu>(url, { deps: [url] });
  usePolling(refresh, { intervalMs: 60_000, enabled: Boolean(data) });

  const { data: catalog } = useApiResource<CatalogItem[]>(`/api/mess/menu/catalog`, {});

  const api = useCallback(async (path: string, method: string, body?: unknown) => {
    const res = await fetch(path, {
      method,
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error?.message ?? res.statusText);
    }
    return res.json();
  }, []);

  const addItem = async () => {
    if (!data?.id) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/mess/menus/${data.id}/items`, "POST", {
        catalog_item_id: newItem.catalogItemId,
        day_of_week: newItem.dayOfWeek,
        meal_type: newItem.mealType,
        is_new: newItem.isNew,
      });
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!data?.id) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/mess/menu/${data.id}/publish`, "POST");
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WidgetBoundary>
      <div className="surface-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-action-primary" />
            Weekly menu · {new Date(`${week}T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </h3>
          <input
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            className="surface-card text-xs px-2 py-1"
            aria-label="Week start"
          />
        </div>

        {err && (
          <div className="surface-card bg-amber-500/10 p-2 text-xs text-action-warning flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {err}
          </div>
        )}

        {!data && <Loader2 className="w-4 h-4 animate-spin text-action-muted" />}

        {data && (
          <>
            <div className="text-xs text-action-muted">
              Status: <span className="font-medium text-action-emphasis">{data.status}</span>
              {data.status === "draft" && " · editable"}
            </div>

            <ul className="space-y-1">
              {data.items.map((it) => (
                <li key={it.id} className="surface-card p-2 text-xs flex items-center justify-between">
                  <span>
                    {DAY_LABELS[it.day_of_week - 1]} · {it.meal_type} — <strong>{it.item_name}</strong>
                    {it.is_new && <span className="ml-1 text-action-primary">(new)</span>}
                  </span>
                  <span className="text-action-muted">{it.status}</span>
                </li>
              ))}
              {data.items.length === 0 && (
                <li className="text-xs text-action-muted">No items yet for this week.</li>
              )}
            </ul>

            {data.status === "draft" && (
              <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={newItem.catalogItemId}
                  onChange={(e) => setNewItem({ ...newItem, catalogItemId: e.target.value })}
                  className="surface-card px-2 py-1"
                  aria-label="Catalog dish"
                >
                  <option value="">Pick a dish…</option>
                  {(catalog ?? []).map((c: CatalogItem) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={newItem.dayOfWeek}
                  onChange={(e) => setNewItem({ ...newItem, dayOfWeek: Number(e.target.value) })}
                  className="surface-card px-2 py-1"
                  aria-label="Day"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>{DAY_LABELS[d - 1]}</option>
                  ))}
                </select>
                <select
                  value={newItem.mealType}
                  onChange={(e) => setNewItem({ ...newItem, mealType: e.target.value })}
                  className="surface-card px-2 py-1"
                  aria-label="Meal"
                >
                  {["breakfast", "lunch", "snacks", "dinner"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <label className="surface-card px-2 py-1 flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newItem.isNew}
                    onChange={(e) => setNewItem({ ...newItem, isNew: e.target.checked })}
                  />
                  new
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addItem}
                  disabled={busy || !newItem.catalogItemId}
                  className="surface-card min-h-11 inline-flex items-center gap-1 px-3 text-xs font-semibold disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
                <button
                  onClick={publish}
                  disabled={busy}
                  className="surface-card min-h-11 inline-flex items-center gap-1 px-3 text-xs font-semibold text-action-primary"
                >
                  <Send className="w-3.5 h-3.5" /> Publish week
                </button>
              </div>
              </>
            )}
          </>
        )}
      </div>
    </WidgetBoundary>
  );
}
