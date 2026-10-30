"use client";

/* ── DecisionCard ── */

import { memo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Clock,
  ExternalLink,
  UserPlus,
  X,
} from "lucide-react";

export const DecisionCard = memo(function DecisionCard({
  ticket, title, subtitle, reason, urgency = "due",
  slaDeadline, onApprove, onReject, onDelegate, onOpen, busy,
}: {
  ticket: string;
  title: string;
  subtitle?: string;
  reason?: string;
  urgency?: "overdue" | "due" | "info";
  slaDeadline?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onDelegate?: () => void;
  onOpen?: () => void;
  busy?: boolean;
}) {
  const accent = { overdue: "border-l-rose-500", due: "border-l-amber-500", info: "border-l-slate-300" }[urgency];
  return (
    <div className={cn(
      "group flex items-start gap-4 rounded-xl border border-[var(--border)] border-l-4 bg-[var(--bg-surface)] p-4",
      "transition-shadow hover:shadow-card-hover", accent,
    )}>
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="block w-full text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--text-muted)]">{ticket}</span>
            {urgency === "overdue" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
            )}
            {slaDeadline && urgency === "due" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                <Clock className="h-3 w-3" /> Due soon
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{subtitle}</div>}
          {reason && <div className="mt-2 line-clamp-2 text-xs text-[var(--text-muted)]">{reason}</div>}
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onApprove && (
          <button onClick={onApprove} disabled={busy}
            className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">
            <Check className="h-4 w-4" />
          </button>
        )}
        {onReject && (
          <button onClick={onReject} disabled={busy}
            className="rounded-lg bg-rose-500/10 p-2 text-rose-500 transition-colors hover:bg-rose-500/20 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        )}
        {onDelegate && (
          <button onClick={onDelegate} disabled={busy}
            className="rounded-lg bg-[var(--bg-subtle)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle-hover)] disabled:opacity-50">
            <UserPlus className="h-4 w-4" />
          </button>
        )}
        {onOpen && (
          <button onClick={onOpen}
            className="rounded-lg bg-[var(--bg-subtle)] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle-hover)]">
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
});
