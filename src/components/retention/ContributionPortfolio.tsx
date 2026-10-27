"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Award,
  Share,
  Download,
  CheckCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  FileText,
  Copy,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getContributionPortfolio, type PortfolioItem } from "@/lib/retention";

/* ------------------------------------------------------------------ */
/* Type labels                                                         */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  achievement: "Achievement",
  event_attendance: "Event Attendance",
  event_registration: "Event Registration",
  goal_completed: "Goal Completed",
  work_assignment: "Work Assignment",
};

const TYPE_COLORS: Record<string, string> = {
  achievement: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  event_attendance: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  event_registration: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  goal_completed: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  work_assignment: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ContributionPortfolio() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exported, setExported] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await getContributionPortfolio();
      if (result.success) {
        setItems(result.data.items);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // Group by type
  const grouped = useMemo(() => {
    const map: Record<string, PortfolioItem[]> = {};
    for (const item of items) {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    }
    return map;
  }, [items]);

  const userName = user?.name;
  const handleExport = useCallback(async () => {
    if (items.length === 0) return;
    try {
      const exportData = items
        .filter((i) => i.verified)
        .map((i) => ({
          title: i.title,
          type: i.type,
          date: i.date,
          verified: true,
        }));

      const json = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          userName,
          items: exportData,
          note: "Verified contributions only. Not an official transcript.",
        },
        null,
        2
      );

      // Copy to clipboard as fallback
      try {
        await navigator.clipboard.writeText(json);
      } catch {
        // Try download
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contribution-portfolio-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch {
      // Silently ignore
    }
  }, [items, userName]);

  const totalVerified = items.filter((i) => i.verified).length;

  return (
    <WidgetBoundary title="Contribution Portfolio">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-100">Contribution Portfolio</h3>
            {totalVerified > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                {totalVerified} verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={items.length === 0 || exported}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 transition-colors motion-reduce:transition-none"
            >
              {exported ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Share className="h-3.5 w-3.5" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-4 rounded-lg border border-slate-700/40 bg-slate-900/30 p-2.5">
          <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified contributions only. This is a personal record, not an
            official transcript. Exported items contain no PII.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="h-32 animate-pulse rounded bg-slate-700/20" />
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              No contributions yet. Participate in campus events, complete goals,
              and earn achievements to build your portfolio.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${
                  TYPE_COLORS[item.type] ?? "text-slate-300 border-slate-700/40 bg-slate-800/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-100 truncate">
                      {item.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] opacity-70">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                      <span className="text-[10px] opacity-60 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>
                    {item.details && (
                      <p className="mt-1 text-[10px] opacity-60 line-clamp-1">
                        {item.details}
                      </p>
                    )}
                  </div>
                  {item.verified && (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ContributionPortfolio;
