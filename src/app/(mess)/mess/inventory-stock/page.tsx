"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Inbox,
} from "lucide-react";

interface InventoryItem {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isPrimary: boolean;
  scheduledDays: number;
}

interface InventoryResponse {
  success: boolean;
  data: {
    items: InventoryItem[];
    primaryCount: number;
    total: number;
  };
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] inline-flex items-center justify-center rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function MessInventoryStockInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);

  const {
    data: inventory,
    loading,
    error,
    refresh,
  } = useApiResource<InventoryResponse>("/api/mess/inventory", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !inventory;
  const d = inventory?.data;
  const items = d?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex min-h-[44px] items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Back to Mess Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <WidgetError message={`Inventory unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      <WidgetBoundary title="Inventory and Stock">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Package className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Inventory &amp; Stock</span>
            <span className="ml-auto text-xs text-slate-500 shrink-0">{d ? `${d.total} item(s)` : "—"}</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading inventory…
            </div>
          ) : items.length > 0 ? (
            <div className="min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Active Items</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{d?.total}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Primary Items</p>
                  <p className="mt-1 text-lg font-bold text-amber-400">{d?.primaryCount}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Stock Levels</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">
                    {items.reduce((sum, i) => sum + i.scheduledDays, 0)}
                  </p>
                  <p className="text-xs text-slate-500">item-day allocations across active mess days</p>
                </div>
              </div>

              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5">Item</th>
                      <th className="text-left px-4 py-2.5">Code</th>
                      <th className="text-left px-4 py-2.5">Type</th>
                      <th className="text-left px-4 py-2.5">Scheduled Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-200 font-medium min-w-0 truncate">{item.label}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{item.code}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.isPrimary ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400">
                              <CheckCircle2 className="w-3 h-3" /> Primary
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-slate-600/40 bg-slate-700/20 text-slate-400">
                              Add-on
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {item.scheduledDays > 0 ? (
                            <span className="text-emerald-400">{item.scheduledDays} day(s)</span>
                          ) : (
                            <span className="text-slate-600">Not scheduled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
                Stock state mirrors the active menu-item catalog. Use{" "}
                <Link href="/mess/operational-requests" className="text-emerald-400 hover:underline">
                  Operational Requests
                </Link>{" "}
                to flag stock shortfalls to the caretaker / facilities authority.
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No active inventory items. Items are published on mess days via the menu
                catalog — manage them from the{" "}
                <Link href="/mess/menu-management" className="text-emerald-400 hover:underline">
                  Menu Management
                </Link>{" "}
                tab.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessInventoryStockPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessInventoryStockInner />
    </Suspense>
  );
}
