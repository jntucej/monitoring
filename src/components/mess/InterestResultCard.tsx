"use client";

import { useState } from "react";

export interface InterestResultData {
  poll_id: string;
  proposed_item: string;
  scope_size: number;
  total_voters: number;
  participation_pct: number;
  participation_met: boolean;
  yes: number;
  maybe: number;
  no: number;
  weighted_yes: number;
  weighted_maybe: number;
  weighted_no: number;
  approval_pct: number;
  approved: boolean;
  avg_conversion_pct: number;
  estimated_portions: number;
  past_conversions: Array<{
    proposed_item: string;
    conversion_pct: number;
    recorded_at: string;
  }>;
}

export function InterestResultCard({
  data,
  onDecided,
}: {
  data: InterestResultData;
  onDecided?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    try {
      await fetch(`/api/mess/interest-polls/${data.poll_id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      onDecided?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{data.proposed_item}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            data.approved
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {data.approved ? "Threshold Met" : "Below Threshold"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-foreground">
        <div>
          Participation: {data.total_voters} / {data.scope_size} (
          {Math.round(data.participation_pct * 100)}%)
        </div>
        <div>Approval: {Math.round(data.approval_pct * 100)}%</div>
        <div>
          Votes: YES {data.yes} • MAYBE {data.maybe} • NO {data.no}
        </div>
        <div>
          Weighted YES: {data.weighted_yes} → ~{data.estimated_portions} portions
        </div>
      </div>

      {data.past_conversions.length > 0 && (
        <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">
            Past-item conversion:
          </div>
          <ul className="mt-1 space-y-0.5">
            {data.past_conversions.map((c, i) => (
              <li key={i}>
                • {c.proposed_item}: {Math.round(c.conversion_pct * 100)}% of YES voters ate
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("approved")}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Approve & Schedule
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("rejected")}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
