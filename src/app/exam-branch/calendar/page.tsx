"use client";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { Loader2, CalendarDays, AlertTriangle, ArrowRight, Building2 } from "lucide-react";

/* /api/campus-extra/calendar response shape */
interface CalendarResponse {
  success: boolean;
  data: {
    events: Array<{
      id: string;
      category: string;
      title: string;
      date: string;
      time: string | null;
      location: string | null;
      owner: string | null;
    }>;
    categories: Array<{ code: string; label: string; color?: string; icon?: string }>;
    followedCategories: string[];
  };
}

function ExamBranchCalendarInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  /* This month so the URL stays stable; re-fetches on mount and every 30 s */
  const month = useMemo(
    () => new Date().toISOString().slice(0, 7),
     
    []
  );

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<CalendarResponse>(
    `/api/campus-extra/calendar?month=${month}&categories=examination`,
    { ttlMs: 30_000, deps: [month] }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const events = data?.data?.events ?? [];
  const cats = data?.data?.categories ?? [];
  const followed = new Set(data?.data?.followedCategories ?? []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Calendar unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Category legend */}
      <WidgetBoundary title="Exam Calendar Categories">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {cats.map((c) => (
              <span
                key={c.code}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  followed.has(c.code)
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    followed.has(c.code) ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                {c.label}
              </span>
            ))}
            {cats.length === 0 && (
              <span className="text-xs text-slate-500">No categories configured yet.</span>
            )}
          </div>
        </div>
      </WidgetBoundary>

      {/* Event list */}
      <WidgetBoundary title="Examination Schedule">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                {new Date().toLocaleString([], { month: "long", year: "numeric" })}
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {events.length} event(s)
            </span>
          </div>

          {busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                No examination events scheduled this month.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Events are published by the examination office and appear automatically.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {events.map((ev) => (
                <li key={ev.id} className="px-4 py-3 flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-white min-w-0 flex-1 truncate">
                      {ev.title}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 text-xs shrink-0">
                      {ev.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 min-w-0">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(ev.date).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {ev.time ? <span>· {ev.time}</span> : null}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {ev.location}
                      </span>
                    )}
                    {ev.owner && <span className="text-slate-600">{ev.owner}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchCalendarPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchCalendarInner />
    </Suspense>
  );
}
