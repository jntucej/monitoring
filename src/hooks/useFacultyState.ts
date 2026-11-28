"use client";

/**
 * useFacultyState — the single state hook for the catalog-driven Faculty OS.
 * Backed by GET /api/faculty/state (live DB, per-faculty, null-tolerant).
 *
 * Every consumer must render an explicit "no data" state when a field is
 * null — no fabricated percentages, no seeded defaults.
 */
import { useApiResource } from "@/hooks/useApiResource";
import type { FacultyState } from "@/app/api/faculty/state/route";

export type { FacultyState };

export function useFacultyState(enabled = true): {
  state: FacultyState | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: FacultyState;
  }>(`/api/faculty/state`, { ttlMs: 30_000, enabled });
  return {
    state: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
