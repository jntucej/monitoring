"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
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
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";

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

function MessMenuInner() {
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <WidgetBoundary title="Menu Management">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <UtensilsCrossed className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Current Menu</span>
          </div>
          <div className="p-4 min-w-0">
            {menuLoading && !menu ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading…
              </div>
            ) : menuError ? (
              <WidgetError message={menuError} onRetry={() => void refreshMenu()} />
            ) : menuHasDay && menuItems.length > 0 ? (
              <div className="space-y-4 min-w-0">
                {/* Meal-day window */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{fmtDate(menuData?.mealDate)}</p>
                      <p className="text-xs text-slate-500">
                        Window: {fmtTime(menuData?.windowOpens)} – {fmtTime(menuData?.windowCloses)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <Link
                    href="/mess/scan"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" /> Token Scanner
                  </Link>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-sm min-w-[360px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-3 py-2.5">Item</th>
                        <th className="text-left px-3 py-2.5">Code</th>
                        <th className="text-left px-3 py-2.5">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {menuItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 py-2.5 text-slate-200 font-medium min-w-0 truncate">{item.label}</td>
                          <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{item.code}</td>
                          <td className="px-3 py-2.5">
                            {item.isAvailable ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 whitespace-nowrap">
                                Available
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-rose-400/30 bg-rose-400/10 text-rose-400 whitespace-nowrap">
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-slate-500">
                  {menuItems.length} item{menuItems.length !== 1 ? "s" : ""} ·{" "}
                  {menuData?.items.filter((i) => i.isAvailable).length} available · Edit actions
                  run from the approvals desk.
                </p>
              </div>
            ) : menuHasDay ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-400">Menu day is scheduled but no items are published yet.</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No menu published yet.</p>
              </div>
            )}
          </div>
        </div>
      </WidgetBoundary>
      <DevContactStrip />
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
