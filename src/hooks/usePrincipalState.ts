"use client";

/**
 * usePrincipalState — the single state hook for the catalog-driven Principal
 * (Data Owner / CAC Chair) dashboard. Backed by GET /api/principal/state
 * (live DB, campus-wide, null-tolerant).
 *
 * Every consumer must render an explicit "no data" state when a field is null —
 * no fabricated counts, no seeded defaults.
 */
import { useApiResource } from "@/hooks/useApiResource";
import type { PrincipalState } from "@/app/api/principal/state/route";

export type { PrincipalState };

export function usePrincipalState(enabled = true): {
  state: PrincipalState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: PrincipalState;
  }>(`/api/principal/state`, { ttlMs: 30_000, enabled });
  return {
    state: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
