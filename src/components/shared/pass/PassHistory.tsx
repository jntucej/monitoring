/**
 * shared/pass/PassHistory — period-filtered pass history with compare + rate + export.
 *
 * The "compare" pillar: this period vs last period, with a rate-the-process
 * star input and CSV export.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { FileDown, Star, Clock, Ticket, Loader2 } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";
import { PeriodPicker } from "@/components/shared/PeriodPicker";
import { DeltaBadge } from "@/components/shared/DeltaBadge";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import type { Period, PeriodKey } from "@/lib/period";
import { getPeriod } from "@/lib/period";
import { useAuthStore } from "@/stores/authStore";

interface PassRow {
  id: string;
  code: string;
  from: string;
  to: string;
  status: string;
  requestedAt: string;
}

function periodFromStr(key: PeriodKey): string {
  const p = getPeriod(key);
  return p.from.slice(0, 10);
}

export function PassHistory({ className }: { className?: string }) {
  const { exportCSV } = useExport();
  const [period, setPeriod] = useState<Period>(getPeriod("this-month"));
  const [passes, setPasses] = useState<PassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/passes", { headers: getAuthHeaders(), cache: "no-store" });
      const body = await res.json().catch(() => null);
      setPasses((body?.data ?? []) as PassRow[]);
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  // Load once
  useMemo(() => { load(); /* eslint-disable-line */ }, [load]);

  const fromStr = periodFromStr(period.key);
  const filtered = useMemo(
    () => passes.filter((p) => p.from.slice(0, 10) >= fromStr),
    [passes, fromStr]
  );

  // Compare: previous same-length window
  const compare = useMemo(() => {
    const prevKey: PeriodKey = period.key === "this-week" ? "last-week"
      : period.key === "this-month" ? "last-month"
      : "all-time";
    const prevFrom = periodFromStr(prevKey);
    const prevCount = passes.filter((p) => p.from.slice(0, 10) >= prevFrom).length;
    return { cur: filtered.length, prev: prevCount, delta: filtered.length - prevCount };
  }, [passes, filtered, period.key]);

  const handleExport = () => {
    exportCSV(
      filtered.map((p) => ({
        type: p.code,
        from: p.from,
        to: p.to,
        status: p.status,
      })),
      [
        { key: "type", header: "Pass Type" },
        { key: "from", header: "From" },
        { key: "to", header: "To" },
        { key: "status", header: "Status" },
      ],
      `pass_history_${period.key}.csv`
    );
  };

  return (
    <WidgetBoundary name="pass-history">
      <div className={cn("rounded-xl border border-border bg-bg-elevated p-4 space-y-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5" /> Pass history
          </p>
          <div className="flex items-center gap-2">
            <PeriodPicker value={period} onChange={setPeriod} />
            <button
              type="button"
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-action-primary disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Compare KPI */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-text-muted">
            {compare.cur} this period · {compare.prev} prev
          </span>
          {compare.prev > 0 && <DeltaBadge value={compare.cur} reference={compare.prev} label="" />}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-text-muted">No passes in this period.</p>
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 20).map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-bg-base px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary capitalize">{(p.code ?? "PASS").replace(/_/g, " ")}</span>
                  <span
                    className={cn(
                      "uppercase font-semibold",
                      p.status === "APPROVED" || p.status === "COMPLETED"
                        ? "text-action-success"
                        : p.status === "REJECTED"
                          ? "text-action-danger"
                          : "text-action-warning"
                    )}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted mt-1">
                  <span className="tabular-nums">{p.from.slice(0, 10)} → {p.to.slice(0, 10)}</span>
                  {/* Rate the process (1-5 stars) */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRates((r) => ({ ...r, [p.id]: n }))}
                        className="p-0.5"
                        aria-label={`Rate ${n}`}
                      >
                        <Star
                          className={cn(
                            "h-3 w-3",
                            (rates[p.id] ?? 0) >= n ? "fill-action-warning text-action-warning" : "text-text-muted"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default PassHistory;
