/**
 * hooks/useConductFlags.ts — fetch a user's conduct flag + event counts.
 *
 * Tier 1 hook. The Warden (and other approver) shells use this to show
 * flag-aware status (e.g. "⚠ 3 on probation"). The data + flag logic lives
 * here, once; the shell decides how to render it.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { useApiResource } from "@/hooks/useApiResource";

export interface ConductFlagCounts {
  watch: number;
  probation: number;
  suspended: number;
  banned: number;
}

export interface UseConductFlagsResult {
  /** Flag counts for the scope (the caller's queue). */
  flags: ConductFlagCounts;
  /** The calling actor's own flag level. */
  selfFlag: string;
  loading: boolean;
  refresh: () => void;
}

/**
 * Fetch conduct flag counts. The endpoint returns a summary of flagged
 * users within the caller's scope. Degrades to all-zero if the endpoint
 * is absent (so shells render cleanly pre-migration).
 */
export function useConductFlags(
  scope?: string,
): UseConductFlagsResult {
  const url = scope ? `/api/conduct/flags/summary?scope=${encodeURIComponent(scope)}` : "/api/conduct/flags/summary";
  const { data, loading, refresh } = useApiResource<{ data: ConductFlagCounts } | null>(url, {
    ttlMs: 30_000,
  });

  const flags = data?.data ?? { watch: 0, probation: 0, suspended: 0, banned: 0 };

  return { flags, selfFlag: "clear", loading, refresh };
}

export default useConductFlags;
