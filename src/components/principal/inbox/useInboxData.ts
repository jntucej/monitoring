"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useApiResource, clearCache, cachedFetch } from "@/hooks/useApiResource";
import type { PermissionItem } from "@/components/approver/PermissionRow";

export interface InboxFilters {
  stage?: string;
  workflowType?: string;
  sla?: "overdue" | "due-soon" | "ok" | "all";
  status?: string;
}

export interface UseInboxDataResult {
  tickets: PermissionItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  total: number;
}

/**
 * useInboxData — fetches /api/permissions with filter query params.
 * Returns the flat ticket array, loading/error state, and a refresh trigger.
 */
export function useInboxData(filters: InboxFilters, enabled = true): UseInboxDataResult {
  const [refreshKey, setRefreshKey] = useState(0);

  const url = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.stage) params.set("stage", filters.stage);
    if (filters.workflowType) params.set("workflowType", filters.workflowType);
    if (filters.sla && filters.sla !== "all") params.set("sla", filters.sla);
    if (filters.status) params.set("status", filters.status);
    const qs = params.toString();
    return `/api/permissions${qs ? `?${qs}` : ""}`;
  }, [filters.stage, filters.workflowType, filters.sla, filters.status]);

  const { data, loading, error: apiError } = useApiResource<{ success: boolean; data?: PermissionItem[]; total?: number }>(
    enabled ? url() : null,
    { deps: [refreshKey, url()], ttlMs: 15_000 },
  );

  const tickets = data?.data ?? [];
  const total = data?.total ?? tickets.length;

  const refresh = useCallback(() => {
    clearCache();
    setRefreshKey((k) => k + 1);
  }, []);

  return { tickets, loading, error: apiError, refresh, total };
}

/**
 * useInboxBatch — batch approve/reject for selected tickets.
 */
export function useInboxBatch() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const run = useCallback(
    async (tickets: string[], action: "APPROVE" | "REJECT" | "FORWARD", comment?: string) => {
      setBusy(true);
      setResult(null);
      let ok = 0;
      let fail = 0;
      for (const ticket of tickets) {
        try {
          const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ action, comment }),
          });
          const json = await res.json();
          if (json.success) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      setResult({ ok, fail });
      setBusy(false);
      clearCache();
    },
    [],
  );

  return { run, busy, result };
}
