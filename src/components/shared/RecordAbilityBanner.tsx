"use client";

/**
 * RecordAbilityBanner — presentational "your role here" banner that renders a
 * record-abilities RecordEventAbility: the mode, the one-line roleReason, and
 * a wrapping row of role-gated action chips.
 *
 * This is the shared UI surface for the fine-grained capability resolvers in
 * `src/lib/record-abilities.ts` (resolvePermissionAbility / resolveComplaintAbility
 * / resolveGateEventAbility). Drawers and record detail pages compute the
 * ability (pure, from live data + viewer) and render it here.
 *
 * Action semantics:
 *   - intent "primary"/"danger"/"secondary" with an `endpoint` are WRITE
 *     actions. This banner does NOT fire writes; it renders them as chips
 *     that link to `fullRoute` (the page that owns the mutation) so the user
 *     lands in the right place. The server remains the source of truth.
 *   - `href` actions are read-only pivots: live links to `href`.
 */

import Link from "next/link";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RecordEventAbility } from "@/lib/record-abilities";

export interface RecordAbilityBannerProps {
  ability: RecordEventAbility | null | undefined;
  /** Destination for write-action chips (the page that owns the mutation). */
  fullRoute?: string;
  /** Compact mode: drop the wrapping card, keep just the inline row. */
  bare?: boolean;
  className?: string;
}

export function RecordAbilityBanner({
  ability,
  fullRoute = "/",
  bare = false,
  className,
}: RecordAbilityBannerProps) {
  if (!ability || ability.actions.length === 0) return null;

  const chip = (intent: string) =>
    intent === "primary"
      ? "bg-action-primary text-white hover:brightness-110"
      : intent === "danger"
        ? "bg-rose-500/15 text-action-danger hover:bg-rose-500/25"
        : "surface-card bg-bg-elevated text-text-primary hover:bg-bg-surface";

  const banner = (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-action-primary shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Your role here · {ability.mode}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">{ability.roleReason}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ability.actions.map((action) => {
          const href = action.href ?? fullRoute;
          return (
            <Link
              key={action.id}
              href={href}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                chip(action.intent),
              )}
            >
              <span>{action.label}</span>
              {action.disabledReason && (
                <span className="ml-1 text-[10px] opacity-70">({action.disabledReason})</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  if (bare) return banner;

  return (
    <div className="surface-card bg-bg-elevated/40 border border-border/50 p-3">
      {banner}
    </div>
  );
}

export default RecordAbilityBanner;
