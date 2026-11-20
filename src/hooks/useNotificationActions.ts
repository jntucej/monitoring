/**
 * hooks/useNotificationActions.ts — resolve the inline actions for a
 * notification type. Returns the action defs from the registry + a
 * dispatcher that POSTs to the action's API endpoint.
 *
 * Tier 1 (hooks) — never forks.
 */

"use client";

import { useCallback } from "react";
import { getNotificationActions, type NotificationTypeDef } from "@/lib/notifications/actions";
import { getAuthHeaders } from "@/lib/utils";

export interface NotificationActionResult {
  /** The action definitions for this notification type. */
  actions: NotificationTypeDef["actions"] | [];
  /** The deep-link target. */
  deepLink: string | undefined;
  /** The human label for the type badge. */
  label: string;
  /** Dispatch an inline action (POST to the action's api, then navigate). */
  dispatch: (actionId: string, notificationId: string) => Promise<boolean>;
}

export function useNotificationActions(
  type: string,
  onSuccess?: () => void,
): NotificationActionResult {
  const def = getNotificationActions(type);
  const actions = def?.actions ?? [];
  const deepLink = def?.deepLink;
  const label = def?.label ?? type;

  const dispatch = useCallback(
    async (actionId: string, notificationId: string): Promise<boolean> => {
      const action = actions.find((a) => a.id === actionId);
      if (!action) return false;

      // Client-only navigation (no api endpoint).
      if (!action.api) {
        if (action.href) window.location.href = action.href;
        onSuccess?.();
        return true;
      }

      // Build the body (static or dynamic).
      const body =
        typeof action.body === "function" ? action.body(notificationId) : (action.body ?? {});

      try {
        const res = await fetch(action.api, {
          method: action.method ?? "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...body, notification_id: notificationId }),
        });
        if (!res.ok) return false;
        onSuccess?.();
      } catch {
        return false;
      }

      // Navigate to the deep-link after the action succeeds.
      if (action.href) window.location.href = action.href;
      return true;
    },
    [actions, onSuccess],
  );

  return { actions, deepLink, label, dispatch };
}

export default useNotificationActions;
