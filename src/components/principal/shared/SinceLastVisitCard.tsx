"use client";

/* ── SinceLastVisitCard ── */
/* Retention layer 1: "what happened since you were last here."
 * Thin projection over /api/principal/retention (reuse useApiResource).
 * Shows the session's new wins + this-week vs last-week delta. No logic.
 */

import { memo } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { PrincipalEmptyState } from "./PrincipalEmptyState";
import { SectionHeader } from "./SectionHeader";

interface RetentionResponse {
  todayWins?: Array<{ ticket: string; outcome: string; subject: string; at: string }>;
  insights?: {
    thisWeek: number;
    lastWeek: number;
    avgResponseSec: number;
  };
}

export function SinceLastVisitCard() {
  const res = useApiResource<RetentionResponse>("/api/principal/retention");

  if (res.loading) {
    return (
      <div className="surface-card bg-bg-surface p-5">
        <SectionHeader label="Since your last visit" hint="Loading…" />
      </div>
    );
  }

  const wins = res.data?.todayWins ?? [];
  const ins = res.data?.insights;
  const delta = ins ? ins.thisWeek - ins.lastWeek : 0;

  if (wins.length === 0 && !ins) {
    return (
      <div className="surface-card bg-bg-surface p-5 flex flex-col gap-3">
        <SectionHeader label="Since your last visit" />
        <PrincipalEmptyState
          title="Nothing new"
          description="No decisions recorded since your last visit."
        />
      </div>
    );
  }

  return (
    <div className="surface-card bg-bg-surface p-5 flex flex-col gap-4">
      <SectionHeader
        label="Since your last visit"
        hint={
          ins != null
            ? `${delta >= 0 ? "+" : ""}${delta} decisions vs last week · avg ${ins.avgResponseSec}s response`
            : undefined
        }
      />
      {wins.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {wins.slice(0, 6).map((w) => (
            <li
              key={w.ticket}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate text-text-primary">
                <span className="font-medium">{w.ticket}</span>{" "}
                <span className="text-text-muted">{w.subject}</span>
              </span>
              <span
                className={`shrink-0 text-xs font-semibold ${
                  w.outcome === "APPROVED"
                    ? "text-accent-mint"
                    : w.outcome === "DELEGATED"
                      ? "text-accent-steel"
                      : "text-accent-rose"
                }`}
              >
                {w.outcome}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default memo(SinceLastVisitCard);
