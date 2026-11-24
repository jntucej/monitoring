"use client";

import { Lock, Info } from "lucide-react";

export interface PermissionScopeHintProps {
  rule: string;
  tone?: "info" | "warn" | "locked";
}

/**
 * PermissionScopeHint — plain-language note explaining why an action is
 * locked, read-only, or requires a second reviewer / higher stage.
 */
export function PermissionScopeHint({
  rule,
  tone = "info",
}: PermissionScopeHintProps) {
  const cls =
    tone === "warn"
      ? "bg-amber-500/10 text-action-warning"
      : tone === "locked"
        ? "bg-bg-elevated text-text-secondary"
        : "bg-action-primary/10 text-action-primary";

  const Icon = tone === "locked" ? Lock : Info;

  return (
    <p className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${cls}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>{rule}</span>
    </p>
  );
}

export default PermissionScopeHint;
