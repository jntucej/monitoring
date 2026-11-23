"use client";

/**
 * PassTicketTierView — role-adapted UI for a pass/permission ticket.
 *
 * Shows:
 *   1. A "why I'm here" banner (role + tier label + mode).
 *   2. Any reason/note text rendered through SmartTextRef for live links.
 *   3. Tier-filtered content sections (pass-qr, chain, student-context, etc.).
 *   4. A decision note input when rejecting/escalating.
 *   5. An action bar scoped to the role's abilities.
 *
 * This is the rendering layer for the pure `getPassTicketRulesForRole()` resolver
 * in `src/lib/pass-ticket-rules.ts`.
 */

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight, AlertTriangle } from "lucide-react";
import {
  getPassTicketRulesForRole,
  type PassTicketSnapshot,
  type PassActionSpec,
  type PassTicketRuleSet,
} from "@/lib/pass-ticket-rules";
import { SmartTextRef } from "./SmartTextRef";
import { cn } from "@/lib/utils";

interface PassTicketTierViewProps {
  role: string | undefined;
  ticket: PassTicketSnapshot;
  /** Optional free-text field (reason, notes) that gets smart-linked. */
  reasonText?: string | null;
  /** Current URL path used to resolve ?inspect= links (default: ""). */
  currentPath?: string;
  /** Called when an API-bound action is triggered. Return a promise if async. */
  onExecuteAction?: (action: PassActionSpec, note?: string) => Promise<void> | void;
  /**
   * Custom section renderer. When provided, called for each visibleSection.
   * When absent, renders placeholder blocks.
   */
  renderSection?: (section: NonNullable<PassTicketRuleSet["visibleSections"]>[number]) => React.ReactNode;
}

type RuleSet = ReturnType<typeof getPassTicketRulesForRole>;

// Color map for mode badges
const MODE_CLS: Record<string, string> = {
  "requester-loop": "border-blue-400/30 bg-blue-400/10 text-blue-400",
  "gate-verify": "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  "stage-act": "border-amber-400/30 bg-amber-400/10 text-amber-400",
  "stage-wait": "border-border/30 bg-muted/20 text-muted-foreground",
  "exec-intervene": "border-rose-400/30 bg-rose-400/10 text-rose-400",
  "sys-trace": "border-violet-400/30 bg-violet-400/10 text-violet-400",
};

export function PassTicketTierView({
  role,
  ticket,
  reasonText,
  currentPath = "",
  onExecuteAction,
  renderSection,
}: PassTicketTierViewProps) {
  const rules = getPassTicketRulesForRole(
    { role: role ?? "", userId: "" },
    ticket,
  );
  const [note, setNote] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  // True if any action spec requires a note before submit
  const needsNote = rules.actions.some((a) => a.requiresNote);

  const runAction = async (act: PassActionSpec) => {
    if (!onExecuteAction || !act.apiAction) return;
    setPendingId(act.id);
    try {
      await onExecuteAction(act, note.trim() || undefined);
      if (act.requiresNote) setNote("");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div
      data-role-tier={rules.tierLabel.split("•")[0].trim().toLowerCase()}
      data-event-mode={rules.mode}
      data-testid="pass-ticket-tier-view"
      className="space-y-4"
    >
      {/* ── Role capability header ─────────────────────────────── */}
      <div
        className={cn(
          "rounded-xl border px-3 py-2.5 space-y-1",
          MODE_CLS[rules.mode] ?? "border-border/30 bg-muted/20",
        )}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            {rules.tierLabel}
          </span>
          <span className="rounded-full border bg-background px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
            {ticket.ticketNumber} &middot; {ticket.currentStage} &middot; {ticket.status}
          </span>
        </div>
        <p className="text-xs text-foreground/80 leading-relaxed">{rules.whyRoleIsHere}</p>
      </div>

      {/* ── Reason / notes with smart references ───────────────── */}
      {reasonText && (
        <div className="rounded-lg border border-dashed p-3 text-xs leading-relaxed bg-background/50">
          <span className="font-semibold text-muted-foreground mr-1.5 shrink-0">Reason / Ref:</span>
          <SmartTextRef text={reasonText} currentPath={currentPath} />
        </div>
      )}

      {/* ── Tier-filtered content sections ─────────────────────── */}
      <div className="space-y-2">
        {rules.visibleSections.map((sec) =>
          renderSection ? (
            <React.Fragment key={sec}>{renderSection(sec)}</React.Fragment>
          ) : (
            <div
              key={sec}
              className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground"
            >
              Section:{" "}
              <span className="font-mono font-medium text-foreground capitalize">
                {sec.replace("-", " ")}
              </span>
            </div>
          ),
        )}
      </div>

      {/* ── Decision / escalation note (when required) ─────────── */}
      {needsNote && onExecuteAction && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            Decision Note (required for this action)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter reason or remarks..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* ── Action bar (pinned bottom thumb-bar on <md) ────────── */}
      <div
        data-testid="action-bar"
        className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-bg-surface/95 backdrop-blur-sm py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:static md:border-t-0 md:bg-transparent md:py-0 md:pt-1"
      >
        {rules.actions.map((act) => {
          // External link button
          if (act.tone === "link" && act.href) {
            return (
              <Link
                key={act.id}
                data-testid={`action-${act.id}`}
                href={act.href}
                scroll={false}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5",
                  "text-xs font-medium hover:bg-accent transition-colors",
                )}
              >
                <span>{act.label}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            );
          }

          // API-bound button
          const toneClass =
            act.tone === "primary"
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : act.tone === "danger"
              ? "bg-destructive text-destructive-foreground hover:opacity-90"
              : "border bg-muted text-foreground hover:bg-accent";

          return (
            <button
              key={act.id}
              data-testid={`action-${act.id}`}
              type="button"
              disabled={pendingId !== null}
              onClick={() => runAction(act)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                "transition-opacity disabled:opacity-50",
                toneClass,
              )}
            >
              <span>{pendingId === act.id ? "Working..." : act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
