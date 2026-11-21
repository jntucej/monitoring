"use client";

/**
 * MessEligibilityCard — "how sure are we the right people got tokens" (PR4).
 *
 * One card at the top of /mess/meal-attendance. Reads the extended
 * /api/mess/meal-counts (expected / issued / served / no-show /
 * excludedByReason) + shows the excluded-reason breakdown, so the mess
 * in-charge sees in one place whether eligible students were actually issued
 * tokens and why the rest were excluded (on leave / opted out / suspended).
 *
 * Gated by the `mess.eligibility.view` capability (the single resolver).
 * No new page — this is the card the plan calls for.
 */

import { useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { Users, CheckCircle2, Ban, AlertTriangle } from "lucide-react";

interface MealCounts {
  messDayId: string;
  mealDate: string;
  total: number;
  confirmed: number;
  noShows: number;
  expected: number;
  issued: number;
  excluded: number;
  excludedByReason: Record<string, number>;
}
interface Resp {
  data: MealCounts;
}

const REASON_LABEL: Record<string, string> = {
  HOSTELLER_ON_LEAVE: "on approved leave",
  HOSTELLER_OPTED_OUT: "opted out",
  DAY_SCHOLAR: "day scholar",
  NO_PREFERENCE: "no preference",
  SUSPENDED: "suspended",
  GRADUATED: "graduated",
};

function MessEligibilityCardInner() {
  const { data, error, loading, refresh } = useApiResource<Resp>(
    "/api/mess/meal-counts",
    { ttlMs: 30_000 },
  );
  const [showExcluded, setShowExcluded] = useState(false);
  const c = data?.data;

  if (loading) {
    return (
      <WidgetBoundary name="MessEligibilityCard" title="Mess eligibility" capability="mess.eligibility.view">
        <PageLoading />
      </WidgetBoundary>
    );
  }
  if (error || !c) {
    return (
      <WidgetBoundary name="MessEligibilityCard" title="Mess eligibility" capability="mess.eligibility.view">
        <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
          Eligibility unavailable{error ? `: ${String(error)}` : ""}.
          <button type="button" onClick={() => refresh?.()} className="ml-2 text-action-primary underline">retry</button>
        </div>
      </WidgetBoundary>
    );
  }

  const reasons = Object.entries(c.excludedByReason ?? {});
  const gap = c.issued - c.expected; // negative if under-issued

  return (
    <WidgetBoundary name="MessEligibilityCard" title="Mess eligibility" capability="mess.eligibility.view">
      <div className="surface-card bg-bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-action-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Mess eligibility</h3>
            <span className="text-xs text-text-muted">{new Date(c.mealDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
          </div>
        </div>

        {/* The four reconciliation numbers */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg bg-bg-elevated p-2.5 text-center">
            <div className="text-lg font-bold text-text-primary tabular-nums">{c.expected}</div>
            <div className="text-[11px] text-text-muted">Expected</div>
          </div>
          <div className="rounded-lg bg-bg-elevated p-2.5 text-center">
            <div className="text-lg font-bold text-text-primary tabular-nums">{c.issued}</div>
            <div className="text-[11px] text-text-muted">Issued</div>
          </div>
          <div className="rounded-lg bg-bg-elevated p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-500 tabular-nums">{c.confirmed}</div>
            <div className="text-[11px] text-text-muted">Served</div>
          </div>
          <div className="rounded-lg bg-bg-elevated p-2.5 text-center">
            <div className="text-lg font-bold text-rose-500 tabular-nums">{c.noShows}</div>
            <div className="text-[11px] text-text-muted">No-show</div>
          </div>
        </div>

        {/* Excluded-reason breakdown */}
        {reasons.length > 0 ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowExcluded((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-action-primary"
            >
              <Ban className="h-3.5 w-3.5" />
              {c.excluded} excluded ({reasons.map(([r, n]) => `${n} ${REASON_LABEL[r] ?? r}`).join(", ")})
              {showExcluded ? " ▲" : " ▼"}
            </button>
            {showExcluded && (
              <div className="grid gap-1 text-xs">
                {reasons.map(([reason, n]) => (
                  <div key={reason} className="flex items-center justify-between rounded bg-bg-elevated px-2 py-1">
                    <span className="text-text-secondary">{REASON_LABEL[reason] ?? reason}</span>
                    <span className="tabular-nums text-text-muted">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" /> No exclusions recorded for this meal.
          </div>
        )}

        {/* Under-issued warning */}
        {gap < 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            {Math.abs(gap)} fewer tokens issued than expected eligible — review the finalize run.
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export function MessEligibilityCard() {
  return <MessEligibilityCardInner />;
}
