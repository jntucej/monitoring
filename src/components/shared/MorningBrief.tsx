"use client";

import Link from "next/link";
import { Sun, CloudSun, Moon, Coffee } from "lucide-react";

/**
 * Shared morning brief used by every approver dashboard (principal,
 * vice-principal, hod). Previously three near-identical copies lived in
 * each role's `_retention/` dir; this is the single source of truth.
 *
 * The per-role `StreakBadge` (which reads a role-specific retention store)
 * is injected by the caller so each role keeps its own streak UI while the
 * brief shell (time-of-day greeting, daily progress, target bar) is shared.
 *
 * `pendingHref`, when set, renders a "View N pending →" link so a role whose
 * queue lives on a specific register (e.g. principal approvals) can jump
 * straight to it. Roles without one simply omit the prop.
 */
export function MorningBrief({
  pending,
  cleared,
  target,
  streak,
  pendingHref,
}: {
  pending: number;
  cleared: number;
  target: number;
  /** Role-specific streak badge, rendered in the brief header. */
  streak: React.ReactNode;
  /** Optional register link shown when `pending > 0`. */
  pendingHref?: string;
}) {
  function timeOfDay(): { icon: typeof Sun; greeting: string } {
    const h = new Date().getHours();
    if (h < 11) return { icon: Coffee, greeting: "Good morning" };
    if (h < 15) return { icon: Sun, greeting: "Good afternoon" };
    if (h < 19) return { icon: CloudSun, greeting: "Good evening" };
    return { icon: Moon, greeting: "Working late" };
  }

  const t = timeOfDay();
  const Icon = t.icon;

  const pct = target > 0 ? Math.min(100, Math.round((cleared / target) * 100)) : 0;
  const message =
    cleared === 0
      ? "A fresh queue — let's move the important ones first."
      : pending === 0
        ? "Queue is clear. Take the rest of the day."
        : cleared >= target
          ? "You're ahead of today's target. Keep going if you want."
          : `${pending} left — you're ${pct}% through today's target.`;

  return (
    <section className="surface-card bg-bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-action-primary/10">
            <Icon className="size-5 text-action-primary" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary">Daily brief</p>
            <p className="text-xs text-text-muted">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
        {streak}
      </div>

      <p className="mt-3 text-sm text-text-secondary">
        {message}{" "}
        {pending > 0 && pendingHref && (
          <Link
            href={pendingHref}
            className="font-semibold text-action-primary hover:underline"
          >
            View {pending} pending &rarr;
          </Link>
        )}
      </p>

      {target > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Today&#39;s progress</span>
            <span className="font-medium text-text-primary tabular-nums">
              {cleared} / {target}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-action-primary transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
