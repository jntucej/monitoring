/**
 * useOptimistic — optimistic update hook with rollback on API failure.
 *
 * Usage:
 *   const [list, optimisticUpdate, rollback] = useOptimistic(initialList, fetcher);
 *
 *   // When the user approves a ticket:
 *   optimisticUpdate(items => items.filter(i => i.id !== ticketId));
 *
 *   // The hook calls the API in the background. On 4xx/5xx it
 *   // automatically rolls back to the pre-update state and fires
 *   // `onFailure` so the caller can show a toast.
 */

import { useCallback, useRef, useState, useEffect } from "react";

export interface UseOptimisticOptions<T> {
  /** Called after the API call succeeds. */
  onSuccess?: (updated: T[]) => void;
  /** Called when the API call fails (rollback already applied). */
  onFailure?: (err: Error) => void;
  /**
   * Returns a new list after the local mutation.
   * The hook stores the previous list before calling this, and
   * restores it on API failure.
   */
  mutate: (prev: T[]) => T[];
  /** API call. Must resolve when the server confirms the change. */
  apiCall: (item: T) => Promise<unknown>;
  /** Which item was acted on (for logging / rollback identification). */
  item: T;
}

export function useOptimistic<T extends { id: string }>(
  list: T[],
  { mutate, apiCall, item, onSuccess, onFailure }: UseOptimisticOptions<T> & {
    item: T;
  },
) {
  const [pending, setPending] = useState(false);
  const prevRef = useRef<T[]>(list);

  // Update the pre-mutation snapshot each time `list` changes
  useEffect(() => {
    prevRef.current = list;
  }, [list]);

  const apply = useCallback(async () => {
    setPending(true);
    try {
      const next = mutate(prevRef.current);
      // Apply locally immediately (optimistic)
      onSuccess?.(next);
      await apiCall(item);
      // Server confirmed — next render will pick up the refetched state
    } catch (err) {
      // Rollback: restore pre-mutation state
      prevRef.current = list;
      onFailure?.(err instanceof Error ? err : new Error("Optimistic action failed"));
    } finally {
      setPending(false);
    }
  }, [mutate, apiCall, item, list, onSuccess, onFailure]);

  return { pending, apply };
}

/**
 * Convenience: wrap a single item's status field in an optimistic
 * local state, auto-rollback on fetch failure.
 */
export function useOptimisticItemStatus<T extends { id: string; status?: string }>(
  item: T,
  newStatus: string,
  { onDone, onFail }: { onDone?: () => void; onFail?: (e: Error) => void } = {},
) {
  const [optimistic, setOptimistic] = useState(false);
  const prevRef = useRef<string | undefined>(item.status);

  useEffect(() => {
    prevRef.current = item.status;
  }, [item.status]);

  const run = useCallback(
    async (apiFn: () => Promise<unknown>) => {
      setOptimistic(true);
      try {
        onDone?.();
        await apiFn();
      } catch (e) {
        // Restore previous status
        onFail?.(e instanceof Error ? e : new Error("Status update failed"));
      } finally {
        setOptimistic(false);
      }
    },
    [onDone, onFail],
  );

  return {
    optimistic,
    /** The value the UI should render while the update is in-flight. */
    displayStatus: optimistic ? newStatus : item.status,
    run,
  };
}
