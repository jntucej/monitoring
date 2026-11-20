/**
 * hooks/useMyAchievements.ts — the user's unlocked + in-progress
 * achievements, with progress + proof links. The "TRACK" + "VERIFY"
 * steps of the achievement loop: "You're 3 events away from 'Event
 * Enthusiast'".
 *
 * Tier 1 (hooks) — never forks.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";

export interface Achievement {
  code: string;
  title: string;
  description?: string;
  /** 0–1 progress toward the achievement. */
  progress: number;
  /** Whether it's unlocked. */
  earned: boolean;
  /** When it was earned (if so). */
  earnedAt?: string;
  /** The source activities that earned it (proof cross-link). */
  proof?: string[];
}

export interface UseMyAchievementsResult {
  achievements: Achievement[];
  /** Unlocked count. */
  unlocked: number;
  /** In-progress (0 < progress < 1). */
  inProgress: Achievement[];
  loading: boolean;
  refresh: () => void;
}

export function useMyAchievements(): UseMyAchievementsResult {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/campus/achievements", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) return;

      const earned: { code: string; title: string; earnedAt: string }[] = json.data.earned ?? [];
      const available: { code: string; title: string; description?: string; earned: boolean; progress?: number; proof?: string[] }[] =
        json.data.available ?? [];

      // Merge: available is the superset; earned confirms + timestamps.
      const earnedMap = new Map(earned.map((e) => [e.code, e.earnedAt]));
      const merged: Achievement[] = available.map((a) => ({
        code: a.code,
        title: a.title,
        description: a.description,
        progress: a.earned ? 1 : (a.progress ?? 0),
        earned: a.earned || earnedMap.has(a.code),
        earnedAt: earnedMap.get(a.code),
        proof: a.proof,
      }));

      // Also include earned-only items (in case available is incomplete).
      const inMerged = new Set(merged.map((a) => a.code));
      for (const e of earned) {
        if (!inMerged.has(e.code)) {
          merged.push({ code: e.code, title: e.title, progress: 1, earned: true, earnedAt: e.earnedAt });
        }
      }

      setAchievements(merged);
    } catch {
      // graceful degradation: achievements stay empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unlocked = achievements.filter((a) => a.earned).length;
  const inProgress = achievements.filter((a) => !a.earned && a.progress > 0 && a.progress < 1);

  return { achievements, unlocked, inProgress, loading, refresh: load };
}

export default useMyAchievements;
