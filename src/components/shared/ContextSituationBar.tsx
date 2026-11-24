"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ContextAction {
  label: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
}

export interface ContextSituationBarProps {
  /** Short live context tag, e.g. "Day Scholar · CSE" or "Lunch Window · 12:30–14:00" */
  contextLabel: string;
  /** Plain-language summary of what is happening right now and what to do next */
  summary: string;
  /** Optional tone for subtle left accent */
  tone?: "neutral" | "ok" | "warn" | "danger";
  /** Primary contextual action right on this screen */
  primaryAction?: ContextAction;
  /** Optional secondary contextual link/action */
  secondaryAction?: ContextAction;
}

const TONE_ACCENT: Record<NonNullable<ContextSituationBarProps["tone"]>, string> = {
  neutral: "text-action-primary",
  ok: "text-action-success",
  warn: "text-action-warning",
  danger: "text-action-danger",
};

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

  if (action.href) {
    return (
      <Link href={action.href} className={cls}>
        <span>{action.label}</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.loading}
      className={`${cls} disabled:opacity-50`}
    >
      <span>{action.loading ? "Working…" : action.label}</span>
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/**
 * ContextSituationBar — answers three questions on any page:
 * 1. Where am I & what is happening right now? (contextLabel)
 * 2. What needs my attention? (summary)
 * 3. What can I do right here? (primaryAction / secondaryAction)
 */
export function ContextSituationBar({
  contextLabel,
  summary,
  tone = "neutral",
  primaryAction,
  secondaryAction,
}: ContextSituationBarProps) {
  return (
    <section
      aria-label="Current context"
      className="surface-card bg-bg-surface p-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="space-y-1 min-w-0 flex-1">
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${TONE_ACCENT[tone]}`}>
          {contextLabel}
        </p>
        <p className="text-sm font-medium text-text-primary">{summary}</p>
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
