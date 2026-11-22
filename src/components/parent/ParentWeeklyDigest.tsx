/**
 * ParentWeeklyDigest — "share my week with parent" one-tap digest card.
 * Renders on the guardian dashboard; also usable on student home for
 * "share with parent" CTA.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Send,
  CalendarDays,
  Ticket,
  MessageSquare,
  UtensilsCrossed,
  MapPin,
  Loader2,
  FileDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { useUIStore } from "@/stores/uiStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────

interface DigestWard {
  id: string;
  name: string;
  roll: string | null;
  attendance: { present: number; absent: number; totalDays: number; pct: number | null };
  passes: Array<{ status: string; count: number }>;
  complaints: Array<{ status: string; count: number }>;
  meals: { count: number; avgScore: number } | null;
  curfew: { inside: boolean; lastGate: string } | null;
}

interface DigestPayload {
  week: string;
  range: { from: string; to: string };
  wards: DigestWard[];
}

// ── Component ─────────────────────────────────────────────────────────────

export function ParentWeeklyDigest() {
  const { exportCSV } = useExport();
  const { addToast } = useUIStore();
  const [data, setData] = useState<DigestPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [week, setWeek] = useState<"this" | "last">("this");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/parent/weekly-digest?week=${week}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.data == null) {
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load digest");
    } finally {
      setLoading(false);
    }
  }, [week]);

  useEffect(() => { void load(); }, [load]);

  const handleShare = () => {
    if (!data) return;
    const text = data.wards.map((w) => {
      const lines = [
        `${w.name}${w.roll ? ` (${w.roll})` : ""} — ${data.week}`,
        `Attendance: ${w.attendance.pct != null ? w.attendance.pct + "%" : "N/A"} (${w.attendance.present} present / ${w.attendance.absent} absent)`,
      ];
      if (w.passes.length > 0) lines.push(`Passes: ${w.passes.map((p) => `${p.count} ${p.status}`).join(", ")}`);
      if (w.complaints.length > 0) lines.push(`Complaints: ${w.complaints.map((c) => `${c.count} ${c.status}`).join(", ")}`);
      if (w.meals) lines.push(`Meals rated: ${w.meals.count}, avg ${w.meals.avgScore}★`);
      if (w.curfew) lines.push(`On campus: ${w.curfew.inside ? "Yes" : "No"} (${w.curfew.lastGate})`);
      return lines.join("\n");
    }).join("\n\n");
    navigator.clipboard?.writeText(text).then(() => {
      addToast({ variant: "success", title: "Copied", message: "Digest copied — paste to your parent app." });
    }).catch(() => {
      addToast({ variant: "error", title: "Copy failed", message: "Could not access clipboard." });
    });
  };

  const handleExport = () => {
    if (!data) return;
    exportCSV(
      data.wards.map((w) => ({
        ward: w.name,
        roll: w.roll ?? "",
        attendance_pct: w.attendance.pct ?? "N/A",
        passes: w.passes.map((p) => `${p.count} ${p.status}`).join("; "),
        complaints: w.complaints.map((c) => `${c.count} ${c.status}`).join("; "),
        meals_rated: w.meals?.count ?? 0,
        meal_avg: w.meals?.avgScore ?? "—",
        on_campus: w.curfew?.inside ? "Yes" : "No",
      })),
      [
        { key: "ward", header: "Ward" },
        { key: "roll", header: "Roll" },
        { key: "attendance_pct", header: "Attendance %" },
        { key: "passes", header: "Passes" },
        { key: "complaints", header: "Complaints" },
        { key: "meals_rated", header: "Meals rated" },
        { key: "meal_avg", header: "Meal avg" },
        { key: "on_campus", header: "On campus" },
      ],
      `weekly_digest_${data.week}_${data.range.from}_${data.range.to}.csv`
    );
  };

  return (
    <WidgetBoundary name="ParentWeeklyDigest" resetKey={week}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-action-info shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Weekly Digest</h2>
              <p className="text-xs text-text-muted">Attendance · passes · complaints · meals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg p-0.5 gap-0.5 bg-bg-elevated border border-border">
              {(["this", "last"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setWeek(k)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    week === k ? "bg-action-primary text-white" : "text-text-secondary hover:bg-bg-surface"
                  )}
                >
                  {k === "this" ? "This week" : "Last week"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleShare}
              disabled={!data || data.wards.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-action-primary text-white hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" /> Share
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!data || data.wards.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-action-primary disabled:opacity-40 rounded-lg"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && !data && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600">
            {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Data */}
        {data && !loading && data.wards.length === 0 && (
          <p className="text-xs text-text-muted">No wards linked.</p>
        )}

        {data && !loading && data.wards.map((w) => (
          <div key={w.id} className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
            {/* Ward header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{w.name}</p>
                {w.roll && <p className="text-xs text-text-muted font-mono">{w.roll}</p>}
              </div>
              {w.curfew && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    w.curfew.inside
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600"
                  )}
                >
                  <MapPin className="h-3 w-3" />
                  {w.curfew.inside ? `On campus · ${w.curfew.lastGate}` : "Off campus"}
                </span>
              )}
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Attendance */}
              <div className="rounded-lg border border-border bg-bg-base p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
                  <CalendarDays className="h-3 w-3" /> Attendance
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-lg font-bold text-text-primary tabular-nums">
                    {w.attendance.pct != null ? `${w.attendance.pct}%` : "—"}
                  </span>
                  {w.attendance.pct != null && w.attendance.pct >= 75 && (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
                <p className="text-[10px] text-text-muted">{w.attendance.present} in · {w.attendance.absent} out</p>
              </div>

              {/* Passes */}
              <div className="rounded-lg border border-border bg-bg-base p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
                  <Ticket className="h-3 w-3" /> Passes
                </div>
                <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                  {w.passes.reduce((s, p) => s + p.count, 0)}
                </p>
                <p className="text-[10px] text-text-muted">
                  {w.passes.length > 0 ? w.passes.map((p) => `${p.count} ${p.status.toLowerCase()}`).join(" · ") : "none"}
                </p>
              </div>

              {/* Complaints */}
              <div className="rounded-lg border border-border bg-bg-base p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
                  <MessageSquare className="h-3 w-3" /> Complaints
                </div>
                <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                  {w.complaints.reduce((s, c) => s + c.count, 0)}
                </p>
                <p className="text-[10px] text-text-muted">
                  {w.complaints.length > 0 ? w.complaints.map((c) => `${c.count} ${c.status.toLowerCase()}`).join(" · ") : "none"}
                </p>
              </div>

              {/* Meals */}
              <div className="rounded-lg border border-border bg-bg-base p-2.5">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted">
                  <UtensilsCrossed className="h-3 w-3" /> Meals
                </div>
                <p className="text-lg font-bold text-text-primary tabular-nums mt-1">
                  {w.meals ? `${w.meals.avgScore}★` : "—"}
                </p>
                <p className="text-[10px] text-text-muted">{w.meals ? `${w.meals.count} rated` : "none"}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Range */}
        {data && (
          <p className="text-xs text-text-muted text-right">
            {data.range.from} → {data.range.to}
          </p>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ParentWeeklyDigest;
