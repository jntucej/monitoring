/**
 * useEditable — inline edit-with-reason hook for single fields.
 * Toggling `editing` shows the input; saving requires a reason (audit trail).
 * Wire `onSave` to your PATCH endpoint.
 */
"use client";

import { useCallback, useState } from "react";

export interface UseEditableOptions<T extends string | number> {
  /** Initial value */
  initial: T;
  /** Persist the change. `reason` is required (audit). */
  onSave: (value: T, reason: string) => Promise<void> | void;
  /** Show cancel button. Default true. */
  canCancel?: boolean;
}

export interface UseEditableResult<T extends string | number> {
  value: T;
  editing: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  /** Call with the new value and a reason. Triggers onSave. */
  saveEdit: (newValue: T, reason: string) => Promise<void>;
  isBusy: boolean;
  hasChanged: boolean;
  lastEditReason?: string;
  draft: T;
  setDraft: (v: T) => void;
}

export function useEditable<T extends string | number>({
  initial,
  onSave,
  canCancel = true,
}: UseEditableOptions<T>): UseEditableResult<T> {
  const [value, setValue] = useState<T>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(initial);
  const [isBusy, setIsBusy] = useState(false);
  const [lastEditReason, setLastEditReason] = useState<string>();

  const startEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const saveEdit = useCallback(
    async (newValue: T, reason: string) => {
      if (!reason.trim()) throw new Error("Reason required");
      setIsBusy(true);
      try {
        await onSave(newValue, reason);
        setValue(newValue);
        setEditing(false);
        setLastEditReason(reason);
      } finally {
        setIsBusy(false);
      }
    },
    [onSave]
  );

  const hasChanged = JSON.stringify(value) !== JSON.stringify(initial);

  return { value, editing, startEdit, cancelEdit, saveEdit, isBusy, hasChanged, lastEditReason, draft, setDraft };
}

export default useEditable;
