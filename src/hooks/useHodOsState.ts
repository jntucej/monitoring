"use client";

/**
 * useHodOsState — the single state hook for the catalog-driven HOD OS hub.
 * Backed by GET /api/hod/os/state (live DB, per-department, null-tolerant).
 *
 * Every consumer must render an explicit "no data" state when a field is
 * null — no fabricated counts, no seeded defaults.
 */
import { useApiResource } from "@/hooks/useApiResource";
import type { HodOsState } from "@/app/api/hod/os/state/route";

export type { HodOsState };

export function useHodOsState(enabled = true): {
  state: HodOsState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: HodOsState;
  }>(`/api/hod/os/state`, { ttlMs: 30_000, enabled });
  return {
    state: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
