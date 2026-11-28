"use client";

import { useApiResource } from "@/hooks/useApiResource";

/**
 * useCatalog — the zero-hardcoding metadata hook. The frontend is a pure
 * schema-driven renderer: every dropdown / filter pill / Kanban column /
 * lockdown target picker / analytics grouping reads from here instead of a
 * static array. Backed by GET /api/config/catalog (live DB, short TTL cache).
 *
 * Returns null while loading / on error; consumers render an explicit
 * "no data" state rather than fabricating a default list.
 */
export interface CatalogItem {
  code: string;
  name?: string;
  count?: number;
}
export interface Catalog {
  departments: CatalogItem[];
  hostelBlocks: CatalogItem[];
  yearSections: { year: number; section: string }[];
  gates: CatalogItem[];
  passTypes: Array<{
    code: string;
    name: string;
    requiresApproval?: boolean;
    approvalFlow?: string;
  }>;
  roles: CatalogItem[];
  complaintCategories: CatalogItem[];
  generated_at: string;
}

export function useCatalog(enabled = true): {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, loading, error, refresh } = useApiResource<{
    success: boolean;
    data: Catalog;
  }>("/api/config/catalog", { ttlMs: 60_000, enabled });
  return {
    catalog: data?.data ?? null,
    loading,
    error: error ?? null,
    refresh,
  };
}
