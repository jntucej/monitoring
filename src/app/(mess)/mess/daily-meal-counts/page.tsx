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
  Calculator,
  CalendarDays,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Inbox,
} from "lucide-react";

interface MealCountsResponse {
  success: boolean;
  data: {
    messDayId: string | null;
    mealDate: string | null;
    total: number;
    declaredPresent: number;
    veg: number;
    nonVeg: number;
    confirmed: number;
    noShows: number;
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
      <div className="flex items-center gap-2 text-slate-500 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 mt-2 animate-spin text-slate-500" />
      ) : (
        <p className={`mt-1 text-xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
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

function MessDailyMealCountsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);

  const {
    data: counts,
    loading,
    error,
    refresh,
  } = useApiResource<MealCountsResponse>("/api/mess/meal-counts", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !counts;
  const d = counts?.data;

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
        <WidgetError message={`Meal counts unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      <WidgetBoundary title="Daily Meal Counts">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <Calculator className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Daily Meal Counts</span>
            <span className="ml-auto text-xs text-slate-500">{fmtDate(d?.mealDate)}</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading daily meal counts…
            </div>
          ) : d && d.total > 0 ? (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 min-w-0">
                <StatCard icon={Users} label="Selected" value={d.total} sub="Preferences declared" accent="text-sky-400" />
                <StatCard icon={CalendarDays} label="Declared Present" value={d.declaredPresent} sub="will_be_present = TRUE" accent="text-amber-400" />
                <StatCard icon={CheckCircle2} label="Served" value={d.confirmed} sub="Confirmed meals" accent="text-emerald-400" />
                <StatCard icon={Inbox} label="No-Shows" value={d.noShows} sub="Declared but not served" accent="text-rose-400" />
                <StatCard icon={Users} label="Veg" value={d.veg} sub="Primary item VEG" accent="text-emerald-400" />
                <StatCard icon={Users} label="Non-Veg" value={d.nonVeg} sub="Primary item NON_VEG" accent="text-rose-400" />
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Counts stream from the mess preferences and serving logs for the meal day above.
                Confirmations run from the{" "}
                <Link href="/mess/scan" className="text-emerald-400 hover:underline">
                  Token Scanner
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No meal selections recorded for this meal day yet. Counts appear once students
                declare a preference for the scheduled mess day.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessDailyMealCountsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessDailyMealCountsInner />
    </Suspense>
  );
}
