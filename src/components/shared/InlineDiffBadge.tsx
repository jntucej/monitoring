"use client";

export interface InlineDiffBadgeProps {
  label: string;
  before: string;
  after: string;
  tone?: "ok" | "warn" | "danger" | "info";
}

const TONE_CLS: Record<NonNullable<InlineDiffBadgeProps["tone"]>, string> = {
  ok: "bg-action-success/15 text-action-success",
  warn: "bg-amber-500/15 text-action-warning",
  danger: "bg-action-danger/15 text-action-danger",
  info: "bg-action-primary/15 text-action-primary",
};

/**
 * InlineDiffBadge — compact "Label: Before -> After" state delta pill
 * so users see the exact change immediately after an action or edit.
 */
export function InlineDiffBadge({
  label,
  before,
  after,
  tone = "info",
}: InlineDiffBadgeProps) {
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TONE_CLS[tone]}`}
    >
      <span className="font-semibold">{label}:</span>
      <span className="line-through opacity-75">{before}</span>
      <span aria-hidden="true">→</span>
      <span className="font-semibold">{after}</span>
    </span>
  );
}

export default InlineDiffBadge;
