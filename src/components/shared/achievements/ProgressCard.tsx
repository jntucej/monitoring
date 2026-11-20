/**
 * shared/achievements/ProgressCard.tsx — progress bar for an in-progress
 * achievement + proof cross-link. "You're 3 events away from 'Event
 * Enthusiast' · Earned via: Robotics, Coding Club, Quiz Night".
 *
 * The "LINK" step: every achievement shows which activities earned it.
 */

"use client";

import { Award, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressCardProps {
  /** The achievement title. */
  title: string;
  /** 0–1 progress. */
  progress: number;
  /** The source activities (proof cross-links). */
  proof?: string[];
  /** Whether it's unlocked. */
  earned?: boolean;
  className?: string;
}

export function ProgressCard({
  title,
  progress,
  proof,
  earned,
  className,
}: ProgressCardProps) {
  const pct = Math.round((earned ? 1 : progress) * 100);

  return (
    <div className={cn("surface-card p-4 space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            earned ? "bg-green-500/10 text-green-400" : "bg-bg-elevated text-text-muted",
          )}
        >
          {earned ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text">{title}</p>
          <p className="text-xs text-text-muted">
            {earned ? "Unlocked" : `${pct}% complete`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!earned && (
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-action-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Proof: the activities that earned it */}
      {proof && proof.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {proof.slice(0, 4).map((p) => (
            <span
              key={p}
              className="flex items-center gap-1 rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-text-muted"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {p}
            </span>
          ))}
          {proof.length > 4 && (
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] text-text-muted">
              +{proof.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ProgressCard;
