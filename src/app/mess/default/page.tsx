"use client";


import React, { Suspense, useEffect, useState } from "react";
import {Check, Loader2, RefreshCw, Save, UtensilsCrossed}  from "lucide-react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

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
        <p className="text-sm font-medium text-text-secondary">Workspace</p>
      </div>

      <WidgetBoundary title="Mess default settings">
        {loading ? (
          <div className="surface-card flex items-center gap-2 p-6 bg-bg-surface text-xs text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin text-action-success" /> Loading your default meal…
          </div>
        ) : empty ? (
          <div className="surface-card space-y-3 p-6 bg-bg-surface">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-action-success" />
              <p className="text-xs font-semibold text-text-primary">No default set yet</p>
            </div>
            <p className="text-xs text-text-muted">
              Pick your default meal below — it will be used to pre-fill the preference window every day.
            </p>
          </div>
        ) : error ? (
          <div className="surface-card space-y-3 p-6 bg-rose-500/10">
            <p className="text-xs font-semibold text-action-danger flex items-center gap-2">
              <Loader2 className="w-4 h-4 hidden" /> Could not load your default settings{error ? `: ${error}` : ""}
            </p>
            <button
              onClick={() => void load()}
              className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-action-danger text-xs font-bold hover:bg-rose-500/20 transition"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="surface-card sm:col-span-2 lg:col-span-2 space-y-4 bg-bg-surface p-5">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-action-success" />
                <h2 className="text-sm font-bold text-text-primary">Default Meal</h2>
              </div>

              {/* Primary toggle */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">Primary item</p>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setPrimaryItem("VEG")}
                    className={` py-2.5 rounded-xl text-xs font-black tracking-wide transition-all "VEG" "borderaction-success text-emerald-950 "text-action-success hover:bg-emerald-500/20" "VEG" "borderaction-success text-emerald-950" "text-action-success hover:bg-emerald-500/20" `}
                  >
                    🥬 VEG
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryItem("NON_VEG")}
                    className={` py-2.5 rounded-xl text-xs font-black tracking-wide transition-all "NON_VEG" "text-rose-950 "text-action-danger hover:bg-rose-500/20" "NON_VEG" "text-rose-950" "text-action-danger hover:bg-rose-500/20" `}
                  >
                    🍖 NON_VEG
                  </button>
                </div>
              </div>

              {/* Sub-items */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">Default sub items</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {SUB_ITEMS.map((s) => {
                    const on = subItemIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSub(s.id)}
                        className={` flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition "text-action-success" "text-text-muted "text-action-success" "text-text-muted" `}
                      >
                        <span
                          className={` inline-flex items-center justify-center w-4 h-4 rounded-sm "bg-action-success borderaction-success text-emerald-950" "" `}
                        >
                          {on && <Check className="size-2" />}
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
                className="surface-card inline-flex items-center gap-1.5 px-4 py-2.5 bg-action-success hover:bg-action-success disabled:opacity-40 disabled:cursor-not-allowed text-emerald-950 text-xs font-black tracking-wide transition"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save defaults
              </button>
            </div>

            {/* Current saved state */}
            {current && (
            <div className="surface-card space-y-2 bg-bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Currently saved</p>
              <p className="text-sm font-bold text-text-primary">
                {current.primaryItem === "VEG" ? "🥬 Veg" : "🍖 Non-Veg"}
              </p>
              <div className="overflow-x-auto">
                <div className="flex flex-wrap gap-1.5">
                  {current.subItemIds?.length ? (
                    current.subItemIds.map((id) => (
                      <span key={id} className="surface-card px-2 py-0.5 bg-emerald-500/15 text-action-success text-xs font-semibold">
                        {SUB_ITEMS.find((s) => s.id === id)?.label ?? id}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-muted">No sub items</span>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </WidgetBoundary>

    </div>
  );
}

export default function MessDefaultPage() {
  return (
    <GuardedPage allowedRoles={["student"]}>
      <Suspense fallback={<div className="p-6 text-sm text-text-muted">Loading…</div>}>
        <MessDefaultInner />
      </Suspense>
    </GuardedPage>
  );
}
