"use client";


import React, { Suspense, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  RefreshCw,
  Save,
  SlidersHorizontal,
  UtensilsCrossed,
} from "lucide-react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

interface MessDefaultData {
  primaryItem: string;
  subItemIds: string[];
}

const SUB_ITEMS = [
  { id: "RICE", label: "Rice" },
  { id: "DAL", label: "Dal" },
  { id: "SALAD", label: "Salad" },
  { id: "CURD", label: "Curd" },
  { id: "ROTI", label: "Extra Roti" },
  { id: "FRIPTASTE", label: "Fruit / Taste" },
];

function MessDefaultInner() {
  const { addToast } = useUIStore();
  const [current, setCurrent] = useState<MessDefaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false); /* true when no saved default yet */

  const [primaryItem, setPrimaryItem] = useState("");
  const [subItemIds, setSubItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setEmpty(false);
    try {
      const res = await fetch("/api/mess/default", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success !== false) {
        const data: MessDefaultData | null = json?.data ?? null;
        if (data === null) {
          /* no saved default yet — show friendly empty state */
          setCurrent(null);
          setEmpty(true);
        } else {
          setCurrent(data);
          setPrimaryItem(data.primaryItem ?? "");
          setSubItemIds(Array.isArray(data.subItemIds) ? data.subItemIds : []);
        }
      } else {
        setError(json?.error?.message ?? json?.error ?? `HTTP ${res.status}`);
      }
    } catch {
      setError("Network error — could not load your default settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (saving || !primaryItem) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mess/default", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ primaryItem, subItemIds }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        addToast({ variant: "success", title: "Defaults saved", message: "Your default meal choice has been updated." });
        await load();
      } else {
        addToast({ variant: "error", title: "Save failed", message: json?.error?.message ?? `HTTP ${res.status}` });
      }
    } catch {
      addToast({ variant: "error", title: "Save failed", message: "Network error — please retry." });
    } finally {
      setSaving(false);
    }
  };

  const toggleSub = (id: string) =>
    setSubItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Workspace</p>
      </div>

      <WidgetBoundary title="Mess default settings">
        {loading ? (
          <div className="flex items-center gap-2 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Loading your default meal…
          </div>
        ) : empty ? (
          <div className="space-y-3 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">No default set yet</p>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Pick your default meal below — it will be used to pre-fill the preference window every day.
            </p>
          </div>
        ) : error ? (
          <div className="space-y-3 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30">
            <p className="text-xs font-semibold text-rose-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 hidden" /> Could not load your default settings{error ? `: ${error}` : ""}
            </p>
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[11px] font-bold hover:bg-rose-500/20 transition"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-2 space-y-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-5">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Default Meal</h2>
              </div>

              {/* Primary toggle */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Primary item</p>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setPrimaryItem("VEG")}
                    className={`py-2.5 rounded-xl text-xs font-black tracking-wide transition-all border ${
                      primaryItem === "VEG"
                        ? "bg-emerald-500 border-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/20"
                        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20"
                    }`}
                  >
                    🥬 VEG
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryItem("NON_VEG")}
                    className={`py-2.5 rounded-xl text-xs font-black tracking-wide transition-all border ${
                      primaryItem === "NON_VEG"
                        ? "bg-rose-500 border-rose-400 text-rose-950 shadow-lg shadow-rose-500/20"
                        : "bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20"
                    }`}
                  >
                    🍖 NON_VEG
                  </button>
                </div>
              </div>

              {/* Sub-items */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Default sub items</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {SUB_ITEMS.map((s) => {
                    const on = subItemIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSub(s.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition ${
                          on
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-[var(--bg-base)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/30"
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border ${
                            on ? "bg-emerald-500 border-emerald-400 text-emerald-950" : "border-[var(--border)]"
                          }`}
                        >
                          {on && <Check className="w-2.5 h-2.5" />}
                        </span>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !primaryItem}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-950 text-xs font-black tracking-wide transition"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save defaults
              </button>
            </div>

            {/* Current saved state */}
            {current && (
            <div className="space-y-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Currently saved</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {current.primaryItem === "VEG" ? "🥬 Veg" : "🍖 Non-Veg"}
              </p>
              <div className="overflow-x-auto">
                <div className="flex flex-wrap gap-1.5">
                  {current.subItemIds?.length ? (
                    current.subItemIds.map((id) => (
                      <span key={id} className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                        {SUB_ITEMS.find((s) => s.id === id)?.label ?? id}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)]">No sub items</span>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessDefaultPage() {
  return (
    <GuardedPage allowedRoles={["student"]}>
      <Suspense fallback={<div className="p-6 text-sm text-[var(--text-muted)]">Loading…</div>}>
        <MessDefaultInner />
      </Suspense>
    </GuardedPage>
  );
}
