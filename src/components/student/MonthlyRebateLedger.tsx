"use client";

import { Receipt, IndianRupee } from "lucide-react";

interface MonthlyRebateLedgerProps {
  totalServed?: number;
  mealRate?: number;
  totalBilled?: number;
  optOutCount?: number;
  monthLabel?: string;
}

export function MonthlyRebateLedger({
  totalServed,
  mealRate,
  totalBilled,
  optOutCount,
  monthLabel = "Current Month",
}: MonthlyRebateLedgerProps) {
  const hasData =
    totalBilled !== undefined ||
    totalServed !== undefined ||
    optOutCount !== undefined ||
    mealRate !== undefined;
  const rebateAmount =
    optOutCount !== undefined && mealRate !== undefined ? optOutCount * mealRate : null;

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Monthly Mess Rebate Ledger
          </h3>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted px-2 py-0.5 rounded-full bg-bg-elevated border border-border">
          {monthLabel}
        </span>
      </div>

      {!hasData ? (
        <p className="text-xs text-text-muted">
          No mess billing data available for this period.
        </p>
      ) : (
        <>
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold tabular-nums text-text-primary">
            ₹{(totalBilled ?? 0).toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-text-muted ml-1.5">net mess charges</span>
        </div>
        <span className="text-xs font-mono tabular-nums text-text-muted">
          {totalServed ?? 0} meals @ ₹{mealRate ?? "—"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
        <div className="p-2 rounded bg-bg-elevated flex items-center justify-between">
          <span className="text-[11px] text-text-muted">Opt-Out Count</span>
          <span className="text-xs font-bold font-mono text-text-primary tabular-nums">
            {optOutCount ?? 0}
          </span>
        </div>
        <div className="p-2 rounded bg-bg-elevated flex items-center justify-between">
          <span className="text-[11px] text-text-muted flex items-center gap-0.5">
            <IndianRupee className="w-3 h-3 text-action-success" /> Rebate Credited
          </span>
          <span className="text-xs font-bold font-mono text-action-success tabular-nums">
            {rebateAmount === null ? "—" : `₹${rebateAmount.toLocaleString("en-IN")}`}
          </span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default MonthlyRebateLedger;
