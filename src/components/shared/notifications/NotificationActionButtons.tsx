/**
 * shared/notifications/NotificationActionButtons.tsx — compact inline
 * action buttons for a notification. Renders 1–2 buttons from the action
 * registry; each POSTs to the action's API + deep-links.
 *
 * Used inside the notification card (not the full ActionableNotification).
 */

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationActions } from "@/hooks/useNotificationActions";

export interface NotificationActionButtonsProps {
  /** The notification id (used to build action bodies). */
  notificationId: string;
  /** The notification type (from the registry). */
  type: string;
  /** Max buttons to show (default 2). */
  max?: number;
  className?: string;
}

export function NotificationActionButtons({
  notificationId,
  type,
  max = 2,
  className,
}: NotificationActionButtonsProps) {
  const { actions, dispatch } = useNotificationActions(type);
  const [acting, setActing] = useState<string | null>(null);
  const [acted, setActed] = useState<string | null>(null);

  const visible = actions.slice(0, max);
  if (visible.length === 0) return null;

  const handle = async (actionId: string) => {
    if (acting) return;
    setActing(actionId);
    const ok = await dispatch(actionId, notificationId);
    setActing(null);
    if (ok) setActed(actionId);
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visible.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => handle(a.id)}
          disabled={acting !== null}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
            a.variant === "primary" && "bg-action-primary text-bg hover:bg-action-primary/90",
            a.variant === "secondary" && "bg-bg-elevated text-text-secondary hover:bg-bg",
            a.variant === "destructive" && "bg-red-500/10 text-red-400 hover:bg-red-500/20",
          )}
        >
          {acting === a.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : acted === a.id ? (
            "Done ✓"
          ) : (
            a.label
          )}
        </button>
      ))}
    </div>
  );
}

export default NotificationActionButtons;
