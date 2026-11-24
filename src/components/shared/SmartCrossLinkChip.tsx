"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export interface SmartCrossLinkChipProps {
  href: string;
  label: string;
  count?: number;
  tone?: "info" | "warn" | "danger" | "ok";
}

const TONE_CLS: Record<NonNullable<SmartCrossLinkChipProps["tone"]>, string> = {
  info: "bg-bg-elevated text-text-secondary hover:text-text-primary",
  warn: "bg-amber-500/15 text-action-warning",
  danger: "bg-action-danger/15 text-action-danger",
  ok: "bg-action-success/15 text-action-success",
};

/**
 * SmartCrossLinkChip — context-carrying navigation chip showing live counts
 * and pre-filtered/pre-loaded query parameters across role workflows.
 */
export function SmartCrossLinkChip({
  href,
  label,
  count,
  tone = "info",
}: SmartCrossLinkChipProps) {
  return (
    <Link
      href={href}
      className={`min-h-11 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 ${TONE_CLS[tone]}`}
    >
      {typeof count === "number" && (
        <span className="rounded-full bg-bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-text-primary">
          {count}
        </span>
      )}
      <span>{label}</span>
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
    </Link>
  );
}

export default SmartCrossLinkChip;
