"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils";
import {
  UtensilsCrossed,
  CalendarDays,
  Eye,
  Loader2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import {
  menuInspection,
  type MenuDayInfo,
  type MessMenuItem,
} from "@/components/approver/wardenConsoleModels";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

interface MenuResponse {
  success: boolean;
  data: {
    mealDate: string | null;
    windowOpens: string | null;
    windowCloses: string | null;
    messDayId: string | null;
    items: Array<{
      id: string;
      code: string;
      label: string;
      sortOrder: number;
      isAvailable: boolean;
    }>;
  };
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "No meal day scheduled";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="surface-card min-h-11 inline-flex items-center justify-center px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function MessMenuInner() {
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newLabel.trim() || addingItem) return;
    setAddingItem(true);
    setAddMsg(null);
    try {
      const res = await fetch("/api/mess/menu-items", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode.trim().toUpperCase(), label: newLabel.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setAddMsg(body?.error?.message ?? "Failed to add menu item.");
        return;
      }
      setNewCode("");
      setNewLabel("");
      setAddMsg("Menu item added to catalog.");
      await refreshMenu();
    } finally {
      setAddingItem(false);
    }
  };
  const {
    data: menu,
    loading: menuLoading,
    error: menuError,
    refresh: refreshMenu,
  } = useApiResource<MenuResponse>("/api/mess/menu", { ttlMs: 30_000 });

  usePolling(refreshMenu, { intervalMs: 30_000, enabled: true });

  const menuData = menu?.data;
  const menuItems = menuData?.items ?? [];
  const menuHasDay = Boolean(menuData?.mealDate);
  const dayInfo: MenuDayInfo = {
    mealDate: menuData?.mealDate ?? null,
    windowOpens: menuData?.windowOpens ?? null,
    windowCloses: menuData?.windowCloses ?? null,
  };
  const inspectItem = (item: MessMenuItem) => {
    inspect(menuInspection(item, dayInfo));
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <ContextSituationBar
        roleLabel="Mess In-Charge"
        purpose="Publish scheduled mess menus, monitor active meal service windows, and inspect item availability"
        contextLabel={`Menu Schedule · ${fmtDate(menuData?.mealDate)}`}
        statusSummary={
          menuHasDay
            ? `${menuItems.length} menu items scheduled (${menuItems.filter((i) => i.isAvailable).length} available). Window: ${fmtTime(menuData?.windowOpens)} – ${fmtTime(menuData?.windowCloses)}.`
            : "No active mess menu published for today. Review upcoming meal day catalogs."
        }
        severity="info"
        primaryAction={{ label: "Token Scanner", href: "/mess/scan" }}
        secondaryActions={[
          { label: "Inventory & Stock", href: "/mess/inventory-stock" },
          { label: "Daily Meal Counts", href: "/mess/daily-meal-counts" },
          { label: "Mess Overview", href: "/mess" },
        ]}
      />
      <form onSubmit={handleAddMenuItem} className="surface-card bg-bg-surface p-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[120px]">
          <label htmlFor="menu-code" className="block text-xs font-medium text-text-muted mb-1">Item Code</label>
          <input
            id="menu-code"
            type="text"
            required
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="e.g. IDLI"
            className="min-h-11 w-full rounded-lg bg-bg-elevated px-3 py-1.5 text-xs text-text-primary"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="menu-label" className="block text-xs font-medium text-text-muted mb-1">Item Label</label>
          <input
            id="menu-label"
            type="text"
            required
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Steamed Idli & Sambar"
            className="min-h-11 w-full rounded-lg bg-bg-elevated px-3 py-1.5 text-xs text-text-primary"
          />
        </div>
        <button
          type="submit"
          disabled={addingItem}
          className="min-h-11 rounded-lg bg-action-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {addingItem ? "Adding…" : "Add Menu Item"}
        </button>
        {addMsg && <p className="w-full text-xs font-medium text-action-primary">{addMsg}</p>}
      </form>
      <WidgetBoundary title="Menu Management">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex items-center gap-2 min-w-0">
            <UtensilsCrossed className="w-4 h-4 text-action-success shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Current Menu</span>
          </div>
          <div className="p-4 min-w-0">
            {menuLoading && !menu ? (
              <div className="flex items-center gap-2 text-sm text-text-muted min-w-0">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading…
              </div>
            ) : menuError ? (
              <WidgetError message={menuError} onRetry={() => void refreshMenu()} />
            ) : menuHasDay && menuItems.length > 0 ? (
              <div className="space-y-4 min-w-0">
                {/* Meal-day window */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-4 h-4 text-action-warning shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{fmtDate(menuData?.mealDate)}</p>
                      <p className="text-xs text-text-muted">
                        Window: {fmtTime(menuData?.windowOpens)} – {fmtTime(menuData?.windowCloses)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <Link
                    href="/mess/scan"
                    className="surface-card inline-flex min-h-11 items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-action-success hover:bg-emerald-500/20 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> Token Scanner
                  </Link>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-sm min-w90">
                    <thead>
                      <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
                        <th className="text-left px-3 py-2.5">Item</th>
                        <th className="text-left px-3 py-2.5">Code</th>
                        <th className="text-left px-3 py-2.5">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {menuItems.map((item) => (
                        <tr key={item.id} className="hover:bg-bg-elevated/30 transition-colors cursor-pointer" onClick={() => inspectItem(item)}>
                          <td className="px-3 py-2.5 text-text-secondary font-medium min-w-0 truncate">{item.label}</td>
                          <td className="px-3 py-2.5 text-text-muted font-mono text-xs whitespace-nowrap">{item.code}</td>
                          <td className="px-3 py-2.5">
                            {item.isAvailable ? (
                              <span className="surface-card inline-block px-2 py-0.5 text-xs font-medium bg-emerald-400/10 text-action-success whitespace-nowrap">
                                Available
                              </span>
                            ) : (
                              <span className="surface-card inline-block px-2 py-0.5 text-xs font-medium bg-rose-400/10 text-action-danger whitespace-nowrap">
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-text-muted">
                  {menuItems.length} item{menuItems.length !== 1 ? "s" : ""} ·{" "}
                  {menuData?.items.filter((i) => i.isAvailable).length} available · Edit actions
                  run from the approvals desk.
                </p>
              </div>
            ) : menuHasDay ? (
              <div className="text-center py-6">
                <p className="text-sm text-text-muted">Menu day is scheduled but no items are published yet.</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <Inbox className="w-5 h-5 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">No menu published yet.</p>
              </div>
            )}
          </div>
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
    </div>
  );
}

export default function MessMenuPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessMenuInner />
    </Suspense>
  );
}
