/**
 * hooks/useActiveTraits.ts — the active traits for the current user.
 *
 * On mount, fetches the user's profile + context and runs the pure
 * `deriveTraits()` kernel. Returns the ActiveTrait[] (sorted by priority)
 * that the resolver (useEffectivePref) consults between the user and
 * persona layers.
 *
 * The derivation is server-trusted: the profile fields come from the auth
 * store (admin-verified), the calendar/roster/weather context is fetched
 * from the API. A trait never self-activates from client state.
 *
 * Tier 1 (hooks) — never forks.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { deriveTraits, type DeriveInput, type DeriveContext } from "@/lib/traits/derive";
import type { ActiveTrait } from "@/lib/traits/types";
import { getAuthHeaders } from "@/lib/utils";

export interface ActiveTraitsResult {
  traits: ActiveTrait[];
  /** True while the traits are being derived (first fetch). */
  loading: boolean;
}

/**
 * Derive the active traits for the current user.
 *
 * The profile signals come from the auth store's `user` (the trusted,
 * admin-verified record). The temporal context (calendar, weather, roster,
 * on-call) is fetched from `/api/traits/context` and merged in.
 */
export function useActiveTraits(): ActiveTraitsResult {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role) ?? "student";
  const [ctx, setCtx] = useState<DeriveContext | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the temporal context (calendar / weather / roster / on-call).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/traits/context", { headers: getAuthHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DeriveContext | null) => {
        if (cancelled || !d) return;
        setCtx(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the DeriveInput from the auth store's user + the fetched context.
  const input: DeriveInput = useMemo(() => {
    const u = (user ?? {}) as Record<string, unknown>;
    return {
      userId: (u.id as string) ?? "",
      role,
      profile: {
        year: (u.year as number | null) ?? null,
        distanceKm: (u.distanceKm as number | null) ?? null,
        language: (u.language as string | null) ?? null,
        medicalChronic: Boolean(u.medicalChronic),
        medicalCondition: (u.medicalCondition as string | null) ?? null,
        hasSickLeave: Boolean(u.hasSickLeave),
        sportsTeam: (u.sportsTeam as string | null) ?? null,
        placementActive: Boolean(u.placementActive),
        scholarship: Boolean(u.scholarship),
        hireDate: (u.hireDate as string | null) ?? null,
        isHod: Boolean(u.isHod),
        hostelBlock: (u.hostelBlock as string | null) ?? null,
        childCount: (u.childCount as number | null) ?? null,
        working: Boolean(u.working),
        oversightFocus: (u.oversightFocus as "compliance" | "analytics" | null) ?? null,
        techComfort: (u.techComfort as "novice" | "ok" | "expert") ?? null,
        childInExamWeek: Boolean(u.childInExamWeek),
      },
      ctx: ctx ?? { now: new Date() },
    };
  }, [user, role, ctx]);

  // Run the pure derivation. Until the context fetch lands, use the
  // profile-derived traits only (temporal ones activate once ctx arrives).
  const traits = useMemo(() => deriveTraits(input), [input]);

  return { traits, loading };
}

export default useActiveTraits;
