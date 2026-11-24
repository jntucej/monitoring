"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Compass, AlertCircle, ShieldAlert } from "lucide-react";
import { SmartTextRef } from "@/components/nav/SmartTextRef";

export interface PrincipalStageCount {
  label: string;
  count: number;
  href?: string;
}

export interface PrincipalPivotTarget {
  kind: "student" | "faculty" | "gate" | "ticket" | "complaint";
  id: string;
  label: string;
  href?: string;
}

export function PrincipalEmptyReconciler({
  title = "No records match this exact filter",
  headlineCount,
  breakdown = [],
}: {
  title?: string;
  headlineCount?: number;
  breakdown?: PrincipalStageCount[];
}) {
  return (
    <div
      data-testid="principal-empty-reconciler"
      className="surface-card p-4 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-action-warning mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          {typeof headlineCount === "number" && headlineCount > 0 && (
            <p className="text-xs text-text-secondary">
              Summary reports{" "}
              <span className="font-semibold text-text-primary">{headlineCount}</span>{" "}
              active/tracked items across stages—use the pivots below to inspect where they sit.
            </p>
          )}
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {breakdown.map((b) =>
            b.href ? (
              <Link
                key={b.label}
                href={b.href}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-action-primary hover:underline transition-colors"
              >
                <span>{b.label}</span>
                <span className="rounded bg-action-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-action-primary">
                  {b.count}
                </span>
                <ArrowUpRight className="h-3 w-3 text-text-muted" />
              </Link>
            ) : (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary"
              >
                <span>{b.label}</span>
                <span className="font-mono font-semibold text-text-primary">{b.count}</span>
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function PrincipalRecordCard({
  recordId,
  title,
  status,
  stage,
  summaryText,
  pivots = [],
  fullHref,
  onInspect,
  onIntervene,
}: {
  recordId: string;
  title: string;
  status: string;
  stage?: string;
  summaryText?: string | null;
  pivots?: PrincipalPivotTarget[];
  fullHref?: string | null;
  onInspect?: () => void;
  onIntervene?: (action: "approve" | "escalate", note?: string) => Promise<void> | void;
}) {
  const pathname = usePathname();
  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (action: "approve" | "escalate") => {
    if (!onIntervene) return;
    setBusy(action);
    try {
      await onIntervene(action, note.trim() || undefined);
      setNote("");
      setShowNoteInput(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      data-role-tier="tier-3"
      data-testid={`principal-record-${recordId}`}
      className="surface-card p-3.5 space-y-3 transition-colors hover:border-action-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-action-primary">{recordId}</span>
            <span className="border-b px-1 py-0.5 text-[11px] font-medium">
              {status}
            </span>
            {stage && (
              <span className="bg-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                stage: {stage}
              </span>
            )}
          </div>
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>

        <div className="flex items-center gap-1.5">
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 text-xs font-medium hover:bg-bg-elevated"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Peek</span>
            </button>
          )}
          {fullHref && (
            <Link
              href={fullHref}
              className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 text-xs font-medium hover:bg-bg-elevated"
            >
              <span>Open</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {summaryText && (
        <p className="text-xs text-text-secondary leading-relaxed">
          <SmartTextRef text={summaryText} currentPath={pathname} />
        </p>
      )}

      {/* Cross-record pivots */}
      {pivots.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {pivots.map((p) => {
            const targetHref =
              p.href ?? `${pathname}${pathname.includes("?") ? "&" : "?"}inspect=${p.kind}:${p.id}`;
            return (
              <Link
                key={`${p.kind}-${p.id}-${p.label}`}
                href={targetHref}
                scroll={false}
                className="inline-flex items-center gap-1 rounded-md bg-action-primary/10 px-2 py-1 text-[11px] font-medium text-action-primary hover:bg-action-primary/20"
              >
                <span>{p.label}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Principal intervention bar */}
      {onIntervene && (
        <div className="border-t pt-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("approve")}
              className="rounded-lg bg-action-primary px-2.5 py-1 text-xs font-medium text-white hover:opacity-95 disabled:opacity-50"
            >
              {busy === "approve" ? "Applying..." : "Approve / Override"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (!showNoteInput) {
                  setShowNoteInput(true);
                  return;
                }
                run("escalate");
              }}
              className="inline-flex items-center gap-1 border px-2.5 py-1 text-xs font-medium hover:bg-bg-elevated disabled:opacity-50"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-action-warning" />
              <span>{busy === "escalate" ? "Escalating..." : "Escalate"}</span>
            </button>
          </div>
          {showNoteInput && (
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add escalation or override note..."
              className="w-full border bg-surface px-2.5 py-1.5 text-xs"
            />
          )}
        </div>
      )}
    </div>
  );
}
