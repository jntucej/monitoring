"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type ContextTone = "info" | "ok" | "warn" | "critical";

export interface ContextAction {
  label: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  badgeCount?: number;
}

export interface ContextSituationBarProps {
  /** Short live context tag, e.g. "Day Scholar · CSE" or "Lunch Window · 12:30–14:00" */
  contextLabel: string;
  /** Plain-language summary of what is happening right now and what to do next */
  summary: string;
  /** Optional secondary explanation ("Why am I seeing this?") */
  why?: string;
  /** Optional live status pill, e.g. "2 pending", "Closes in 25m" */
  statusPill?: string;
  /** Semantic tone variant */
  statusTone?: ContextTone;
  /** Backwards-compatible alias for statusTone */
  tone?: "neutral" | "ok" | "warn" | "danger";
  /** Primary contextual action right on this screen */
  primaryAction?: ContextAction;
  /** Optional secondary contextual link/action */
  secondaryAction?: ContextAction;
}

const TONE_STYLES: Record<
  ContextTone,
  { label: string; pill: string }
> = {
  info: {
    label: "text-action-primary",
    pill: "bg-action-primary/10 text-action-primary",
  },
  ok: {
    label: "text-action-success",
    pill: "bg-action-success/10 text-action-success",
  },
  warn: {
    label: "text-action-warning",
    pill: "bg-action-warning/10 text-action-warning",
  },
  critical: {
    label: "text-action-danger",
    pill: "bg-action-danger/10 text-action-danger",
  },
};

function resolveTone(
  statusTone?: ContextTone,
  tone?: ContextSituationBarProps["tone"],
): ContextTone {
  if (statusTone) return statusTone;
  if (tone === "ok") return "ok";
  if (tone === "warn") return "warn";
  if (tone === "danger") return "critical";
  return "info";
}

function ActionControl({
  action,
  variant,
}: {
  action: ContextAction;
  variant: "primary" | "secondary";
}) {
  const cls =
    variant === "primary"
      ? "inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
      : "inline-flex items-center gap-1.5 rounded-lg bg-bg-elevated px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors shrink-0";

  const badge =
    typeof action.badgeCount === "number" && action.badgeCount > 0 ? (
      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-black/20 rounded-full tabular-nums">
        {action.badgeCount}
      </span>
    ) : null;

  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={cls}>
        <span>{action.label}</span>
        {badge}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      title={action.disabled ? action.disabledReason : undefined}
      className={`${cls} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span>{action.loading ? "Working…" : action.label}</span>
      {badge}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/**
 * ContextSituationBar — answers three questions on any page:
 * 1. Where am I & what is happening right now? (contextLabel + statusPill)
 * 2. What needs my attention & why? (summary + why)
 * 3. What can I do right here? (primaryAction / secondaryAction)
 */
export function ContextSituationBar({
  contextLabel,
  summary,
  why,
  statusPill,
  statusTone,
  tone,
  primaryAction,
  secondaryAction,
}: ContextSituationBarProps) {
  const resolved = resolveTone(statusTone, tone);
  const styles = TONE_STYLES[resolved];

  return (
    <section
      aria-label="Current context"
      className="surface-card bg-bg-surface p-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${styles.label}`}>
            {contextLabel}
          </p>
          {statusPill && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.pill}`}>
              {statusPill}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-text-primary">{summary}</p>
        {why && <p className="text-xs text-text-muted">{why}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {secondaryAction && <ActionControl action={secondaryAction} variant="secondary" />}
          {primaryAction && <ActionControl action={primaryAction} variant="primary" />}
        </div>
      )}
    </section>
  );
}

export default ContextSituationBar;
