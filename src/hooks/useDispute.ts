/**
 * useDispute — client-side dispute/issue tracking.
 * No server call; wire `onSubmit` to your API endpoint.
 */
"use client";

import { useCallback, useState } from "react";

export interface DisputeEntry {
  id: string;
  reason: string;
  category?: string;
  status: "open" | "in-review" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export interface UseDisputeOptions {
  /** Persist a new dispute. Called on submit. */
  onSubmit: (d: Omit<DisputeEntry, "id" | "status" | "createdAt"> & { id?: string }) => Promise<void> | void;
  initial?: DisputeEntry[];
}

export interface UseDisputeResult {
  disputes: DisputeEntry[];
  openDisputes: DisputeEntry[];
  submitDispute: (reason: string, category?: string) => Promise<void>;
  isBusy: boolean;
}

let _id = 0;
function nextId() {
  _id += 1;
  return `dsp-${Date.now()}-${_id}`;
}

export function useDispute({ onSubmit, initial = [] }: UseDisputeOptions): UseDisputeResult {
  const [disputes, setDisputes] = useState<DisputeEntry[]>(initial);
  const [isBusy, setIsBusy] = useState(false);

  const submitDispute = useCallback(
    async (reason: string, category?: string) => {
      const entry: DisputeEntry = {
        id: nextId(),
        reason,
        category,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      setIsBusy(true);
      try {
        await onSubmit(entry);
        setDisputes((prev) => [entry, ...prev]);
      } finally {
        setIsBusy(false);
      }
    },
    [onSubmit]
  );

  const openDisputes = disputes.filter((d) => d.status !== "resolved");

  return { disputes, openDisputes, submitDispute, isBusy };
}

export default useDispute;
