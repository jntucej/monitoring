"use client";

import { useApiResource } from "@/hooks/useApiResource";

/**
 * Live, DB-derived categories for the campus — branch/department codes, hostel
 * blocks, gates, and roles. Sourced from GET /api/admin/categories so new
 * branches / blocks appear automatically with real counts. The consumer must
 * NOT hardcode any of these lists.
 *
 * Returns null while loading / on error; consumers render an explicit
 * "no data" state rather than fabricating a default list.
 */
export interface CategoryItem {
  code: string;
  name?: string;
  count: number;
}
export interface CampusCategories {
  departments: CategoryItem[];
  hostelBlocks: CategoryItem[];
  gates: CategoryItem[];
  roles: CategoryItem[];
}

export function useCategories(enabled = true): {
  categories: CampusCategories | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: CampusCategories;
  }>("/api/admin/categories", { ttlMs: 60_000, enabled });
  return {
    categories: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
