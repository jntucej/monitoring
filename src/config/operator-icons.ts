/**
 * Operator icon language (principle 4: icon-first, text-second).
 *
 * Every action/condition maps to a stable icon token. Tokens resolve to a
 * lucide component here; labels are the human-readable fallback shown next
 * to the icon. No text-only buttons: every button pairs an icon with a label.
 */

import {
  ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, ShieldAlert, Flag,
  Hourglass, KeyRound, Clock, Lock, MoreHorizontal, type LucideIcon,
} from "lucide-react";

export interface OperatorIconMeta {
  /** lucide component for the token. */
  icon: LucideIcon;
  /** Human label (text-second). */
  label: string;
  /** Optional CSS var color token for the state. */
  tone?: "success" | "warning" | "danger" | "neutral";
}

export const OPERATOR_ICONS: Record<string, OperatorIconMeta> = {
  in: { icon: ArrowUp, label: "In", tone: "success" },
  out: { icon: ArrowDown, label: "Out", tone: "warning" },
  healthy: { icon: CheckCircle2, label: "Healthy", tone: "success" },
  caution: { icon: AlertTriangle, label: "Caution", tone: "warning" },
  critical: { icon: ShieldAlert, label: "Critical", tone: "danger" },
  queued: { icon: Hourglass, label: "Queued", tone: "warning" },
  approved: { icon: CheckCircle2, label: "Approved", tone: "success" },
  locked: { icon: Lock, label: "Locked", tone: "danger" },
  curfew: { icon: Clock, label: "Curfew", tone: "warning" },
  flag: { icon: Flag, label: "Flag", tone: "danger" },
  manual: { icon: KeyRound, label: "Manual", tone: "neutral" },
  log: { icon: Hourglass, label: "Log", tone: "neutral" },
  more: { icon: MoreHorizontal, label: "More", tone: "neutral" },
  scan: { icon: CheckCircle2, label: "Scan", tone: "neutral" },
};

export function operatorIcon(token: string): OperatorIconMeta {
  return OPERATOR_ICONS[token] ?? { icon: ShieldAlert, label: token, tone: "neutral" };
}

/** Tone → CSS var color class helper. */
export const toneClass: Record<NonNullable<OperatorIconMeta["tone"]>, string> = {
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-[var(--action-danger)]",
  neutral: "text-[var(--text-secondary)]",
};
