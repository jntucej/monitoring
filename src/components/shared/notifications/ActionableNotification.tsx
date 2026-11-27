/**
 * shared/notifications/ActionableNotification.tsx — a notification card
 * with inline action buttons. The "actionable notification" multiplier:
 * one component makes every notification type reachable to its owner
 * feature. Tapping an action POSTs to the action's API + deep-links.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationActions } from "@/hooks/useNotificationActions";
import { getNotificationActions } from "@/lib/notifications/actions";

export interface ActionableNotificationProps {
  /** The notification id (used to build action bodies + mark as acted). */
  id: string;
  /** The notification type (from the registry). */
  type: string;
  /** The notification title. */
  title: string;
  /** Optional subtitle / detail line. */
  subtitle?: string;
  /** Timestamp display. */
  timeAgo?: string;
  /** Class name. */
  className?: string;
}

export function ActionableNotification({
  id,
  type,
  title,
  subtitle,
  timeAgo,
  className,
}: ActionableNotificationProps) {
  const router = useRouter();
  const { actions, deepLink, label, dispatch } = useNotificationActions(type);
  const [acting, setActing] = useState<string | null>(null);
  const [acted, setActed] = useState<string | null>(null);

  const def = getNotificationActions(type);

  const handleAction = async (actionId: string) => {
    if (acting) return;
    setActing(actionId);
    const ok = await dispatch(actionId, id);
    setActing(null);
    if (ok) setActed(actionId);
  };

  return (
    <div
      className={cn(
        "surface-card p-3 space-y-2",
        className,
      )}
    >
      {/* Header: type badge + title + time */}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
        {timeAgo && (
          <span className="shrink-0 text-[10px] text-text-muted/60">{timeAgo}</span>
        )}
      </div>

      {/* Actions: 1–2 inline buttons + optional deep-link */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAction(a.id)}
              disabled={acting !== null || acted === a.id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                a.variant === "primary" &&
                  "bg-action-primary text-bg hover:bg-action-primary/90",
                a.variant === "secondary" &&
                  "bg-bg-elevated text-text-secondary hover:bg-bg",
                a.variant === "destructive" &&
                  "bg-red-500/10 text-red-400 hover:bg-red-500/20",
              )}
            >
              {acting === a.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : acted === a.id ? (
                "Done ✓"
              ) : (
                a.label
              )}
            </button>
          ))}
        </div>
      )}

      {/* Deep-link: "open full record" */}
      {deepLink && (
        <button
          type="button"
          onClick={() => router.push(deepLink)}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text"
        >
          Open full record
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default ActionableNotification;
