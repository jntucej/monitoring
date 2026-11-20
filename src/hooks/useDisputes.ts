/**
 * hooks/useDisputes.ts — the universal dispute hook. Every feature gets
 * "request if wrong" for free: call useDisputes() and you get the user's
 * open disputes + a create() function that posts to /api/disputes.
 *
 * Tier 1 (hooks) — never forks.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";

export interface Dispute {
  id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  status: "open" | "reviewed" | "resolved" | "rejected";
  resolution_note?: string;
  escalated_to?: string;
  created_at: string;
  resolved_at?: string;
}

export interface UseDisputesResult {
  /** The user's disputes (most recent first). */
  disputes: Dispute[];
  /** True while the first fetch is in flight. */
  loading: boolean;
  /** Create a new dispute. Returns the created dispute or null on failure. */
  create: (input: {
    entity_type: string;
    entity_id: string;
    reason: string;
    evidence?: Record<string, unknown>;
  }) => Promise<Dispute | null>;
  /** Refetch. */
  refresh: () => void;
}

export function useDisputes(status?: "open"): UseDisputesResult {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = useCallback(async () => {
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/disputes${qs}`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setDisputes(data.disputes ?? []);
    } catch {
      // graceful degradation: disputes stay empty
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const create = useCallback(
    async (input: {
      entity_type: string;
      entity_id: string;
      reason: string;
      evidence?: Record<string, unknown>;
    }) => {
      try {
        const res = await fetch("/api/disputes", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(input),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.dispute) {
          setDisputes((prev) => [data.dispute, ...prev]);
          return data.dispute as Dispute;
        }
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  return { disputes, loading, create, refresh: fetchDisputes };
}

export default useDisputes;
