"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  RefreshCw,
  CalendarDays,
  Ban,
  BarChart3,
  Check,
  Clock,
  AlertTriangle,
  ChevronRight,
  Leaf,
  Beef,
  Lock,
  Users,
  Ticket,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import type {
  MessAnalytics,
  MessDay,
  MessMenuItem,
} from "@/lib/types";

/* ── types for forms ─────────────────────────────────────────────────────── */

interface MenuItemDraft {
  id?: string;
  code: string;
  label: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface MealDayDraft {
  mealDate: string;
  dayType: string;
  windowOpens: string;
  windowCloses: string;
  items: string[];
}

const DAY_TYPES = ["LUNCH", "DINNER", "BREAKFAST", "SPECIAL"] as const;

function timeToIso(dateIso: string, timeStr: string): string {
  if (!dateIso) return "";
  try {
    const d = new Date(`${dateIso}T${timeStr || "00:00"}`);
    return d.toISOString();
  } catch {
    return "";
  }
}

function isoToTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

function SectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Menu Items tab ──────────────────────────────────────────────────────── */

function MenuItemsTab() {
  const { addToast } = useUIStore();
  const itemsRes = useApiResource<MessMenuItem[] | { items: MessMenuItem[] }>("/api/mess/menu-items");

  const items: MessMenuItem[] = (() => {
    if (!itemsRes.data) return [];
    const d = itemsRes.data as unknown;
    if (Array.isArray(d)) return d as MessMenuItem[];
    return (d as { items?: MessMenuItem[] }).items ?? [];
  })();

  const [editing, setEditing] = useState<MenuItemDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startNew = () =>
    setEditing({
      code: "",
      label: "",
      isPrimary: false,
      sortOrder: items.length + 1,
    });

  const startEdit = (it: MessMenuItem) =>
    setEditing({ ...it });

  const saveItem = async () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.label.trim()) {
      addToast({
        variant: "warning",
        title: "Missing fields",
        message: "Code and label are required.",
      });
      return;
    }
    setSaving(true);
    try {
      const headers = getAuthHeaders();
      let res: Response;
      if (editing.id) {
        res = await fetch(`/api/mess/menu-items/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            code: editing.code.trim(),
            label: editing.label.trim(),
            isPrimary: editing.isPrimary,
            sortOrder: editing.sortOrder,
          }),
        });
      } else {
        res = await fetch("/api/mess/menu-items", {
          method: "POST",
          headers,
          body: JSON.stringify({
            code: editing.code.trim(),
            label: editing.label.trim(),
            isPrimary: editing.isPrimary,
            sortOrder: editing.sortOrder,
          }),
        });
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
        );
      }
      addToast({ variant: "success", title: editing.id ? "Item updated" : "Item added", message: editing.label });
      clearCache("/api/mess/menu-items");
      await itemsRes.refresh();
      setEditing(null);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Could not save item",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/mess/menu-items/${encodeURIComponent(deleteId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast({ variant: "success", title: "Item deleted", message: "Menu item removed." });
      clearCache("/api/mess/menu-items");
      await itemsRes.refresh();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Could not delete item",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  );

  return (
    <div className="space-y-4">
      {itemsRes.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{itemsRes.error}</span>
          <button
          type="button"
            onClick={() => void itemsRes.refresh()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      <SectionCard
        title="Menu Item Catalog"
        subtitle="Items students can select as their primary or sub-item"
        action={
          <button
          type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        }
      >
        {itemsRes.loading && items.length === 0 ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No menu items yet. Add the first one.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-left border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-2">#</th>
                  <th className="py-2.5 px-2">Code</th>
                  <th className="py-2.5 px-2">Label</th>
                  <th className="py-2.5 px-2">Primary</th>
                  <th className="py-2.5 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sorted.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 pr-2 text-slate-500 tabular-nums">{it.sortOrder}</td>
                    <td className="py-2.5 px-2">
                      <span className="font-mono text-xs text-slate-300 bg-slate-800/60 border border-slate-700 rounded px-1.5 py-0.5">
                        {it.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-white">{it.label}</td>
                    <td className="py-2.5 px-2">
                      {it.isPrimary ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Primary
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Sub-item</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                        type="button"
                          onClick={() => startEdit(it)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                          aria-label={`Edit ${it.label}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                        type="button"
                          onClick={() => setDeleteId(it.id)}
                          className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center transition"
                          aria-label={`Delete ${it.label}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Editor */}
      {editing && (
        <SectionCard
          title={editing.id ? `Edit: ${editing.label}` : "New menu item"}
          action={
            <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-white">
            type="button"
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Code</span>
              <input
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                placeholder="RICE"
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Label</span>
              <input
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="Rice"
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sort order</span>
              <input
                type="number"
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </label>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</span>
              <div className="mt-1 flex gap-2">
                <button
                type="button"
                  onClick={() => setEditing({ ...editing, isPrimary: true })}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    editing.isPrimary
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500/30"
                  }`}
                >
                  Primary
                </button>
                <button
                type="button"
                  onClick={() => setEditing({ ...editing, isPrimary: false })}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    !editing.isPrimary
                      ? "bg-slate-500/15 border-slate-500/40 text-slate-300"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500/30"
                  }`}
                >
                  Sub-item
                </button>
              </div>
            </div>
          </div>
          <button
          type="button"
            onClick={() => void saveItem()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {editing.id ? "Update item" : "Add item"}
          </button>
        </SectionCard>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete menu item?"
        body="This item will no longer be available for new meal days. Existing days are not affected."
        onConfirm={deleteItem}
        confirmText="Delete"
      />
    </div>
  );
}

/* ── Meal Days tab ───────────────────────────────────────────────────────── */

function MealDaysTab() {
  const { addToast } = useUIStore();
  const daysRes = useApiResource<MessDay[] | { days: MessDay[] }>("/api/mess/days");
  const itemsRes = useApiResource<MessMenuItem[] | { items: MessMenuItem[] }>("/api/mess/menu-items");

  const days: MessDay[] = (() => {
    if (!daysRes.data) return [];
    const d = daysRes.data as unknown;
    if (Array.isArray(d)) return d as MessDay[];
    return (d as { days?: MessDay[] }).days ?? [];
  })();

  const items: MessMenuItem[] = (() => {
    if (!itemsRes.data) return [];
    const d = itemsRes.data as unknown;
    if (Array.isArray(d)) return d as MessMenuItem[];
    return (d as { items?: MessMenuItem[] }).items ?? [];
  })();

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const [draft, setDraft] = useState<MealDayDraft>(() => ({
    mealDate: new Date().toISOString().slice(0, 10),
    dayType: "LUNCH",
    windowOpens: "12:30",
    windowCloses: "14:00",
    items: [],
  }));
  const [creating, setCreating] = useState(false);
  const [editingDay, setEditingDay] = useState<MessDay | null>(null);
  const [editingDraft, setEditingDraft] = useState<MealDayDraft | null>(null);
  const [cancelDayId, setCancelDayId] = useState<string | null>(null);

  const toggleItem = (id: string) =>
    setDraft((d) => ({
      ...d,
      items: d.items.includes(id) ? d.items.filter((x) => x !== id) : [...d.items, id],
    }));

  const createDay = async () => {
    if (!draft.mealDate) {
      addToast({ variant: "warning", title: "Date required", message: "Pick a meal date first." });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/mess/days", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mealDate: draft.mealDate,
          dayType: draft.dayType,
          windowOpens: timeToIso(draft.mealDate, draft.windowOpens),
          windowCloses: timeToIso(draft.mealDate, draft.windowCloses),
          items: draft.items,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
        );
      }
      addToast({ variant: "success", title: "Meal day created", message: draft.mealDate });
      clearCache("/api/mess/days");
      await daysRes.refresh();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Create failed",
        message: err instanceof Error ? err.message : "Could not create meal day",
      });
    } finally {
      setCreating(false);
    }
  };

  const startEditDay = (day: MessDay) => {
    setEditingDay(day);
    setEditingDraft({
      mealDate: day.mealDate,
      dayType: day.dayType ?? "LUNCH",
      windowOpens: isoToTime(day.windowOpens),
      windowCloses: isoToTime(day.windowCloses),
      items: day.itemIds ?? [],
    });
  };

  const saveEditDay = async () => {
    if (!editingDay || !editingDraft) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/mess/days/${encodeURIComponent(editingDay.id)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mealDate: editingDraft.mealDate,
          dayType: editingDraft.dayType,
          windowOpens: timeToIso(editingDraft.mealDate, editingDraft.windowOpens),
          windowCloses: timeToIso(editingDraft.mealDate, editingDraft.windowCloses),
          items: editingDraft.items,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
        );
      }
      addToast({ variant: "success", title: "Meal day updated", message: editingDraft.mealDate });
      clearCache("/api/mess/days");
      await daysRes.refresh();
      setEditingDay(null);
      setEditingDraft(null);
    } catch (err) {
      addToast({
        variant: "error",
        title: "Update failed",
        message: err instanceof Error ? err.message : "Could not update meal day",
      });
    } finally {
      setCreating(false);
    }
  };

  const cancelDay = async () => {
    if (!cancelDayId) return;
    try {
      const res = await fetch(`/api/mess/days/${encodeURIComponent(cancelDayId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast({ variant: "success", title: "Meal day cancelled", message: "The meal day has been cancelled." });
      clearCache("/api/mess/days");
      await daysRes.refresh();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Cancel failed",
        message: err instanceof Error ? err.message : "Could not cancel meal day",
      });
    } finally {
      setCancelDayId(null);
    }
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return d;
    }
  };

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.mealDate.localeCompare(b.mealDate)),
    [days]
  );

  const toggleEditItem = (id: string) =>
    setEditingDraft((d) =>
      d
        ? {
            ...d,
            items: d.items.includes(id) ? d.items.filter((x) => x !== id) : [...d.items, id],
          }
        : d
    );

  return (
    <div className="space-y-4">
      {daysRes.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{daysRes.error}</span>
          <button
          type="button"
            onClick={() => void daysRes.refresh()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      <SectionCard
        title="Create Meal Day"
        subtitle="Set the date, type, serving window and which menu items are on"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meal date</span>
            <input
              type="date"
              value={draft.mealDate}
              onChange={(e) => setDraft({ ...draft, mealDate: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Day type</span>
            <select
              value={draft.dayType}
              onChange={(e) => setDraft({ ...draft, dayType: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {DAY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Window opens</span>
            <input
              type="time"
              value={draft.windowOpens}
              onChange={(e) => setDraft({ ...draft, windowOpens: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Window closes</span>
            <input
              type="time"
              value={draft.windowCloses}
              onChange={(e) => setDraft({ ...draft, windowCloses: e.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </label>
        </div>

        {/* Items multi-select */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Items on this day
          </span>
          {items.length === 0 ? (
            <p className="text-[11px] text-slate-600 mt-1">No menu items available yet.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {items.map((it) => {
                const on = draft.items.includes(it.id);
                return (
                  <button
                    type="button"
                    key={it.id}
                    onClick={() => toggleItem(it.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                      on
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-500 hover:border-emerald-500/30"
                    }`}
                  >
                    {on && <Check className="w-3 h-3" />}
                    {it.isPrimary ? (
                      it.label === "Veg" || it.label.toLowerCase() === "veg" ? (
                        <Leaf className="w-3 h-3" />
                      ) : (
                        <Beef className="w-3 h-3" />
                      )
                    ) : null}
                    {it.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
        type="button"
          onClick={() => void createDay()}
          disabled={creating}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
        >
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create meal day
        </button>
      </SectionCard>

      {/* Days list */}
      <SectionCard
        title="Scheduled Meal Days"
        subtitle={String(sortedDays.length)}
        action={
          <button
          type="button"
            onClick={() => void daysRes.refresh()}
            className="text-slate-500 hover:text-white"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      >
        {sortedDays.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">No meal days scheduled.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-2">Date</th>
                  <th className="py-2.5 px-2">Type</th>
                  <th className="py-2.5 px-2">Window</th>
                  <th className="py-2.5 px-2">Items</th>
                  <th className="py-2.5 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {sortedDays.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 pr-2 font-semibold text-white">{fmtDate(d.mealDate)}</td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400">
                      {(d.dayType ?? "").replace(/_/g, " ") || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-400 tabular-nums">
                      {isoToTime(d.windowOpens) || "—"} – {isoToTime(d.windowCloses) || "—"}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {(d.itemIds ?? []).map((iid) => {
                          const it = itemById.get(iid);
                          return (
                            <span
                              key={iid}
                              className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700 text-[10px] text-slate-300"
                            >
                              {it?.label ?? iid.slice(0, 6)}
                            </span>
                          );
                        })}
                        {(d.itemIds ?? []).length === 0 && <span className="text-[11px] text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                        type="button"
                          onClick={() => startEditDay(d)}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                          aria-label="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                        type="button"
                          onClick={() => setCancelDayId(d.id)}
                          className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center transition"
                          aria-label="Cancel day"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Edit day */}
      {editingDay && editingDraft && (
        <SectionCard
          title={`Edit meal day — ${fmtDate(editingDraft.mealDate)}`}
          action={
            <button onClick={() => { setEditingDay(null); setEditingDraft(null); }} className="text-slate-500 hover:text-white">
            type="button"
              <X className="w-4 h-4" />
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Meal date</span>
              <input
                type="date"
                value={editingDraft.mealDate}
                onChange={(e) => setEditingDraft({ ...editingDraft, mealDate: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Day type</span>
              <select
                value={editingDraft.dayType}
                onChange={(e) => setEditingDraft({ ...editingDraft, dayType: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {DAY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Window opens</span>
              <input
                type="time"
                value={editingDraft.windowOpens}
                onChange={(e) => setEditingDraft({ ...editingDraft, windowOpens: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Window closes</span>
              <input
                type="time"
                value={editingDraft.windowCloses}
                onChange={(e) => setEditingDraft({ ...editingDraft, windowCloses: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </label>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Items</span>
            {items.length === 0 ? (
              <p className="text-[11px] text-slate-600 mt-1">No menu items.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {items.map((it) => {
                  const on = editingDraft.items.includes(it.id);
                  return (
                    <button
                        key={it.id}
                        type="button"
                        onClick={() => toggleEditItem(it.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                        on
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-900 border-slate-700 text-slate-500 hover:border-emerald-500/30"
                      }`}
                    >
                      {on && <Check className="w-3 h-3" />}
                      {it.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
          type="button"
            onClick={() => void saveEditDay()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save changes
          </button>
        </SectionCard>
      )}

      <ConfirmDialog
        open={Boolean(cancelDayId)}
        onClose={() => setCancelDayId(null)}
        title="Cancel this meal day?"
        body="Cancelling will stop the preference window for this day and revoke pending tokens. Students will no longer be able to select for this meal."
        onConfirm={cancelDay}
        confirmText="Cancel day"
        variant="destructive"
      />
    </div>
  );
}

/* ── Analytics tab ───────────────────────────────────────────────────────── */

interface DayAnalyticsRow {
  dayId: string;
  mealDate: string;
  analytics: MessAnalytics | null;
  error?: string;
}

function AnalyticsTab() {
  const daysRes = useApiResource<MessDay[] | { days: MessDay[] }>("/api/mess/days");

  const days: MessDay[] = (() => {
    if (!daysRes.data) return [];
    const d = daysRes.data as unknown;
    if (Array.isArray(d)) return d as MessDay[];
    return (d as { days?: MessDay[] }).days ?? [];
  })();

  const [rows, setRows] = useState<DayAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (days.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        days.map(async (day) => {
          try {
            const res = await fetch(`/api/mess/analytics?dayId=${encodeURIComponent(day.id)}`, {
              headers: getAuthHeaders(),
              cache: "no-store",
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
              return {
                dayId: day.id,
                mealDate: day.mealDate,
                analytics: null,
                error: `HTTP ${res.status}`,
              } satisfies DayAnalyticsRow;
            }
            const data: MessAnalytics = (json.data ?? json) as MessAnalytics;
            return {
              dayId: day.id,
              mealDate: day.mealDate,
              analytics: data,
            } satisfies DayAnalyticsRow;
          } catch (err) {
            return {
              dayId: day.id,
              mealDate: day.mealDate,
              analytics: null,
              error: err instanceof Error ? err.message : "fetch failed",
            } satisfies DayAnalyticsRow;
          }
        })
      );
      setRows(
        [...results]
          .sort((a, b) => b.mealDate.localeCompare(a.mealDate))
          .slice(0, 30)
      );
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (days.length > 0) void loadAnalytics();
  }, [days.length, loadAnalytics]);

  const fmtDate = (d: string) => {
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-4">
      {daysRes.error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Could not load meal days: {daysRes.error}</span>
        </div>
      )}

      <SectionCard
        title="Historical Meal-Day Counts"
        subtitle="Last 30 meal days — declared vs confirmed vs no-show"
        action={
          <button
          type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reload
          </button>
        }
      >
        {loading && rows.length === 0 ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-500">
            No historical data yet. Schedule meal days to start collecting counts.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="text-left border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-2">Date</th>
                  <th className="py-2.5 px-2">Total</th>
                  <th className="py-2.5 px-2">Declared</th>
                  <th className="py-2.5 px-2">Confirmed</th>
                  <th className="py-2.5 px-2">Not selected</th>
                  <th className="py-2.5 px-2">Veg / Non</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {rows.map((r) => {
                  const a = r.analytics;
                  const veg = a?.byPrimary?.veg ?? 0;
                  const non = a?.byPrimary?.nonVeg ?? 0;
                  return (
                    <tr key={r.dayId} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 pr-2 font-semibold text-white">{fmtDate(r.mealDate)}</td>
                      <td className="py-2.5 px-2 text-slate-300 tabular-nums">{a?.totalHostellers ?? "—"}</td>
                      <td className="py-2.5 px-2 text-emerald-400 tabular-nums">{a?.declaredPresent ?? "—"}</td>
                      <td className="py-2.5 px-2 text-emerald-400 tabular-nums">{a?.confirmedPresent ?? "—"}</td>
                      <td className="py-2.5 px-2 text-amber-400 tabular-nums">{a?.notSelected ?? "—"}</td>
                      <td className="py-2.5 px-2">
                        {a ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                              <div
                                className="h-full bg-emerald-500"
                                style={{
                                  width: veg + non
                                    ? `${Math.round((veg / (veg + non)) * 100)}%`
                                    : "0%",
                                }}
                              />
                              <div className="h-full bg-rose-500 flex-1" />
                            </div>
                            <span className="text-[10px] text-slate-500 tabular-nums">
                              {veg}/{non}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600">{r.error ?? "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ── Today tab ─────────────────────────────────────────────────────────────── */

interface MenuTodayItem {
  id: string;
  code: string;
  label: string;
  isAvailable: boolean;
}

interface TodayMenuData {
  mealDate: string | null;
  messDayId: string | null;
  items: MenuTodayItem[];
}

interface CountsTimelineRow {
  messDayId: string;
  mealDate: string;
  servedTotal: number;
}

function TodayTab() {
  const { addToast } = useUIStore();
  const menuRes = useApiResource<TodayMenuData | null>("/api/mess/menu");
  const mealCountsRes = useApiResource<Record<string, unknown> | null>("/api/mess/meal-counts");
  const consumptionRes = useApiResource<{ days: number; trend: CountsTimelineRow[]; totals: Record<string, number> } | null>(
    "/api/mess/consumption?days=14"
  );

  const menu: MenuTodayItem[] = (menuRes.data as TodayMenuData | null)?.items ?? [];
  const counts = mealCountsRes.data as Record<string, unknown> | null;
  const trend: CountsTimelineRow[] = (consumptionRes.data as { trend?: CountsTimelineRow[] } | null)?.trend ?? [];
  const total = counts ? Number(counts.total ?? 0) : 0;
  const confirmed = counts ? Number(counts.confirmed ?? 0) : 0;
  const noShows = counts ? Number(counts.noShows ?? 0) : 0;

  const issued = confirmed + noShows;
  const remaining = Math.max(0, total - issued);

  const [headcount, setHeadcount] = useState<string>("");
  const [finalizing, setFinalizing] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const messDayId = (menuRes.data as TodayMenuData | null)?.messDayId ?? null;

  const finalizeDay = async () => {
    if (!messDayId) return;
    setFinalizing(true);
    try {
      const res = await fetch("/api/admin/mess-finalize", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messDayId,
          finalHeadcount: headcount.trim() !== "" ? Number(headcount) : confirmed,
          confirmedBy: "MANUAL_FINALIZE",
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
        );
      }
      addToast({ variant: "success", title: "Day finalized", message: `Headcount ${json?.data?.finalHeadcount} locked.` });
      clearCache("/api/mess/menu");
      clearCache("/api/mess/meal-counts");
      await menuRes.refresh();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Finalize failed",
        message: err instanceof Error ? err.message : "Could not finalize day",
      });
    } finally {
      setFinalizing(false);
    }
  };

  const revokeAllTokens = async () => {
    if (!messDayId) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/mess/revoke", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ dayId: messDayId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(
          typeof json?.error === "string" ? json.error : json?.error?.message ?? `HTTP ${res.status}`
        );
      }
      addToast({
        variant: "success",
        title: "Tokens revoked",
        message: `${json?.data?.revokedCount ?? 0} token(s) revoked for ${menuRes.data?.mealDate ?? "this day"}.`,
      });
      clearCache("/api/mess/menu");
      clearCache("/api/mess/meal-counts");
      await menuRes.refresh();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Revoke failed",
        message: err instanceof Error ? err.message : "Could not revoke tokens",
      });
    } finally {
      setRevoking(false);
    }
  };

  const maxServed = trend.reduce((m, r) => Math.max(m, r.servedTotal), 1);

  return (
    <div className="space-y-4">
      {(menuRes.error || mealCountsRes.error || consumptionRes.error) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            {[menuRes.error, mealCountsRes.error, consumptionRes.error].filter(Boolean).join(" · ")}
          </span>
          <button
            type="button"
            onClick={() => {
              void menuRes.refresh();
              void mealCountsRes.refresh();
              void consumptionRes.refresh();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's menu */}
        <SectionCard
          title="Today's Menu"
          subtitle={(menuRes.data as TodayMenuData | null)?.mealDate ?? "No active meal day"}
        >
          {menuRes.loading && menu.length === 0 ? (
            <PageLoading />
          ) : menu.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              No menu items scheduled for the active meal day.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {menu.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {it.code === "VEG" ? (
                      <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Beef className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="font-semibold text-white text-xs truncate">{it.label}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700 rounded px-1.5 py-0.5">
                      {it.code}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      it.isAvailable ? "text-emerald-400" : "text-slate-500 line-through"
                    }`}
                  >
                    {it.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Token status */}
        <SectionCard title="Token Status" subtitle="Issued · verified · remaining">
          {mealCountsRes.loading ? (
            <PageLoading />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center">
                  <Users className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white tabular-nums">{issued}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Issued</p>
                </div>
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center">
                  <Check className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white tabular-nums">{confirmed}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verified</p>
                </div>
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 text-center">
                  <Ticket className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-white tabular-nums">{remaining}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Remaining</p>
                </div>
              </div>

              <div>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Final headcount
                  </span>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={headcount}
                      onChange={(e) => setHeadcount(e.target.value)}
                      placeholder={String(confirmed)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmFinalize(true)}
                      disabled={!messDayId || finalizing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition"
                    >
                      {finalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                      Finalize Day
                    </button>
                  </div>
                </label>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(true)}
                  disabled={!messDayId || revoking}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold transition w-full"
                >
                  {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Revoke All Tokens
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Counts timeline */}
      <SectionCard
        title="Counts Timeline"
        subtitle="Per-day served headcount, last 14 days"
      >
        {consumptionRes.loading && trend.length === 0 ? (
          <PageLoading />
        ) : trend.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No serving data yet.</p>
        ) : (
          <div className="space-y-2">
            {trend.map((r) => (
              <div key={r.messDayId} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 w-24 shrink-0 tabular-nums">
                  {r.mealDate.slice(5)}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/80 rounded-full transition-all"
                    style={{ width: `${Math.round((r.servedTotal / maxServed) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-white font-bold tabular-nums w-10 text-right">
                  {r.servedTotal}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmFinalize}
        onClose={() => setConfirmFinalize(false)}
        title="Finalize this mess day?"
        body={`The headcount (${headcount.trim() !== "" ? headcount : confirmed}) will be locked and the selection window closed for this day. This cannot be undone.`}
        onConfirm={finalizeDay}
        confirmText="Finalize"
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="Revoke all tokens for this day?"
        body="All unused, unrevoked tokens for the active meal day will be revoked immediately. Students will not be able to redeem them."
        onConfirm={revokeAllTokens}
        confirmText="Revoke tokens"
        variant="destructive"
      />
    </div>
  );
}

/* ── main page ───────────────────────────────────────────────────────────── */

type Tab = "today" | "menu" | "days" | "analytics";

function AdminMessInner() {
  const [tab, setTab] = useState<Tab>("today");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "today", label: "Today", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "menu", label: "Menu Items", icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
    { id: "days", label: "Meal Days", icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1220] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-black text-white truncate">Mess Operations</p>
              <p className="text-[11px] text-slate-500">
                Today's menu, token status, counts, and historical analytics
              </p>
            </div>
          </div>
          <Link
            href="/mess"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold transition shrink-0"
          >
            Incharge dashboard <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-[#0d1220] p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
              tab === t.id
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <WidgetBoundary title="Mess operations">
        {tab === "today" && <TodayTab />}
        {tab === "menu" && <MenuItemsTab />}
        {tab === "days" && <MealDaysTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function AdminMessPage() {
  return (
    
      <Suspense
        fallback={
          <div className="p-8 flex items-center justify-center min-h-[50vh]">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <AdminMessInner />
      </Suspense>
    
    

  );
}
