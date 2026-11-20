/**
 * hooks/useRoleCounts.ts — shared data + count-derivation for role status bars.
 *
 * The 15 role status bars are presentation-only (they receive `counts` as
 * props). The duplication lives upstream in RoleConsole: 15 role-specific
 * `useMemo` blocks each with their own fetch + derivation.
 *
 * This hook is the kernel that collapses that duplication. A role console
 * calls `useRoleCounts(role, { source, derive })` and gets back a stable
 * `{ counts, loading, refresh }` — the fetch + loading + derivation live here,
 * once. The console's JSX stays 100% custom per role.
 *
 * Tier 1 (hooks) — never forks.
 */

"use client";

import { useCallback, useMemo } from "react";

export interface UseRoleCountsResult<TCounts> {
  counts: TCounts | null;
  loading: boolean;
  refresh: () => void;
  lastScan: string | null;
}

/**
 * Generic role-counts hook. The `derive` callback is the role's custom
 * logic; the fetch / loading / last-scan plumbing is shared.
 *
 * @example
 *   // Warden console — derives its own open/urgent counts:
 *   const { counts, loading } = useRoleCounts<HostelManagerData, HostelManagerCounts>(data, {
 *     derive: (d, extra) => ({
 *       openTickets: d?.pendingCount ?? 0,
 *       urgent: 0,
 *       hostel: (extra?.hostel as string | null) ?? null,
 *       lastUpdate: d ? new Date().toISOString() : null,
 *     }),
 *     extra: { hostel: assignedHostel },
 *   });
 */
export function useRoleCounts<TData, TCounts>(
  data: TData | null,
  opts: {
    derive: (d: TData | null, extra?: Record<string, unknown>) => TCounts | null;
    /** Optional extra inputs to the derive function (e.g. hostel scope). */
    extra?: Record<string, unknown>;
  },
): UseRoleCountsResult<TCounts> {
  // The data + loading + refresh come from the parent's shared fetch.
  // This hook only centralizes the *derivation* — the one thing each role
  // must do differently — into a stable, memoized callback.
  const counts = useMemo(() => opts.derive(data, opts.extra), [data, opts]);

  // lastScan: newest timestamp in the dataset.
  const lastScan = useMemo(() => newestTimestamp(data), [data]);

  const loading = data === null;

  // Refresh is a no-op here (the parent owns the fetch); exposed for API
  // symmetry so shells can call it uniformly.
  const refresh = useCallback(() => {}, []);

  return { counts, loading, refresh, lastScan };
}

/** Find the newest ISO timestamp in a data payload (best-effort). */
function newestTimestamp(data: unknown): string | null {
  if (!data) return null;
  let newest: string | null = null;
  const visit = (obj: unknown, depth = 0) => {
    if (depth > 4 || !obj || typeof obj !== "object") return;
    const rec = obj as Record<string, unknown>;
    for (const key of ["timestamp", "created_at", "updated_at", "lastUpdate", "set_at"]) {
      const v = rec[key];
      if (typeof v === "string" && !Number.isNaN(Date.parse(v))) {
        if (!newest || new Date(v).getTime() > new Date(newest).getTime()) newest = v;
      }
    }
    for (const val of Object.values(rec)) {
      if (Array.isArray(val)) val.forEach((x) => visit(x, depth + 1));
      else if (val && typeof val === "object") visit(val, depth + 1);
    }
  };
  visit(data);
  return newest;
}

export default useRoleCounts;
